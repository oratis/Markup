import Foundation

/// A tag with how many notes carry it.
public struct TagCount: Equatable, Sendable, Identifiable {
    public var tag: String
    public var count: Int
    public var id: String { tag }
    public init(tag: String, count: Int) { self.tag = tag; self.count = count }
}

/// SQLite-backed index for the vault: full-text search (FTS5), links/backlinks,
/// tags, and per-document outline. The native replacement for the desktop
/// Tantivy index. Rebuildable from the vault; lives in the app container.
public final class IndexService {
    private let db: SQLiteDB

    /// Open (or create) an index. Use ":memory:" for a transient/test index.
    public init(path: String = ":memory:") throws {
        db = try SQLiteDB(path: path)
        try db.exec("PRAGMA journal_mode=WAL;")
        try createSchema()
    }

    private func createSchema() throws {
        try db.exec("""
        CREATE TABLE IF NOT EXISTS documents(
          rel_path TEXT PRIMARY KEY, title TEXT, mtime REAL, size INTEGER, word_count INTEGER);
        CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(
          rel_path UNINDEXED, title, body, tokenize='unicode61');
        CREATE TABLE IF NOT EXISTS links(
          src TEXT, target TEXT, target_lc TEXT, heading TEXT, is_embed INTEGER);
        CREATE TABLE IF NOT EXISTS tags(rel_path TEXT, tag TEXT);
        CREATE TABLE IF NOT EXISTS headings(rel_path TEXT, level INTEGER, text TEXT, line INTEGER);
        CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_lc);
        CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
        CREATE INDEX IF NOT EXISTS idx_headings_path ON headings(rel_path);
        """)
    }

    // MARK: - Indexing

    /// Index (or re-index) one document. Replaces any prior rows for `relPath`.
    public func index(relPath: String, name: String, content: String,
                      mtimeMs: Double = 0, size: Int = 0) throws {
        try remove(relPath: relPath)

        let title = firstHeadingText(content) ?? stripMarkdownExtension(name)
        try db.run(
            "INSERT INTO documents(rel_path,title,mtime,size,word_count) VALUES(?,?,?,?,?)",
            [.text(relPath), .text(title), .double(mtimeMs), .int(size), .int(countWords(content))])
        try db.run(
            "INSERT INTO fts(rel_path,title,body) VALUES(?,?,?)",
            [.text(relPath), .text(title), .text(content)])

        for link in parseWikilinks(content) {
            try db.run(
                "INSERT INTO links(src,target,target_lc,heading,is_embed) VALUES(?,?,?,?,?)",
                [.text(relPath), .text(link.target), .text(link.target.lowercased()),
                 .text(link.heading ?? ""), .int(link.isEmbed ? 1 : 0)])
        }
        for tag in extractTags(content) {
            try db.run("INSERT INTO tags(rel_path,tag) VALUES(?,?)", [.text(relPath), .text(tag)])
        }
        for h in parseHeadings(content) {
            try db.run(
                "INSERT INTO headings(rel_path,level,text,line) VALUES(?,?,?,?)",
                [.text(relPath), .int(h.level), .text(h.text), .int(h.line)])
        }
    }

    /// Remove all rows for a document (e.g. on delete or before re-index).
    public func remove(relPath: String) throws {
        for table in ["documents", "fts", "links", "tags", "headings"] {
            let col = (table == "links") ? "src" : "rel_path"
            try db.run("DELETE FROM \(table) WHERE \(col)=?", [.text(relPath)])
        }
    }

    /// Number of indexed documents.
    public func documentCount() throws -> Int {
        let s = try db.prepare("SELECT COUNT(*) FROM documents")
        return s.step() ? s.int(0) : 0
    }

    // MARK: - Search

    /// Full-text + operator search. Honours `tag:` / `path:` operators and
    /// free text (FTS5). Results are best-first.
    public func search(_ rawQuery: String, limit: Int = 200) throws -> [SearchHit] {
        let parsed = parseQuery(rawQuery)
        let match = ftsMatchExpression(parsed.text)

        var hits: [SearchHit] = []
        if let match {
            let s = try db.prepare("""
            SELECT d.rel_path, d.title, d.mtime, bm25(fts) AS rank
            FROM fts JOIN documents d ON d.rel_path = fts.rel_path
            WHERE fts MATCH ? ORDER BY rank LIMIT ?
            """)
            s.bindAll([.text(match), .int(limit)])
            while s.step() {
                hits.append(SearchHit(
                    path: s.text(0), title: s.text(1), mtimeMs: s.double(2), score: -s.double(3)))
            }
        } else {
            // No free text → list by recency (operators still filter below).
            let s = try db.prepare(
                "SELECT rel_path, title, mtime FROM documents ORDER BY mtime DESC LIMIT ?")
            s.bindAll([.int(limit)])
            while s.step() {
                hits.append(SearchHit(path: s.text(0), title: s.text(1), mtimeMs: s.double(2), score: 0))
            }
        }

        // Apply tag / path operators.
        if !parsed.tags.isEmpty {
            let tagged = try paths(withAnyTag: parsed.tags)
            hits = hits.filter { tagged.contains($0.path) }
        }
        if !parsed.paths.isEmpty {
            hits = hits.filter { pathMatches($0.path, parsed.paths) }
        }
        return hits
    }

    // MARK: - Navigation queries

    /// Notes linking to a file (by base name, case-insensitive, ext-agnostic).
    public func backlinks(toName name: String) throws -> [String] {
        let base = stripMarkdownExtension(name).lowercased()
        let s = try db.prepare("""
        SELECT DISTINCT src FROM links
        WHERE target_lc = ? OR target_lc = ? ORDER BY src
        """)
        s.bindAll([.text(base), .text(base + ".md")])
        var out: [String] = []
        while s.step() { out.append(s.text(0)) }
        return out
    }

    /// Outline (headings) for one document.
    public func outline(of relPath: String) throws -> [Heading] {
        let s = try db.prepare(
            "SELECT level, text, line FROM headings WHERE rel_path=? ORDER BY line")
        s.bindAll([.text(relPath)])
        var out: [Heading] = []
        while s.step() { out.append(Heading(level: s.int(0), text: s.text(1), line: s.int(2))) }
        return out
    }

    /// All tags with counts, most-used first.
    public func allTags() throws -> [TagCount] {
        let s = try db.prepare(
            "SELECT tag, COUNT(*) c FROM tags GROUP BY tag ORDER BY c DESC, tag")
        var out: [TagCount] = []
        while s.step() { out.append(TagCount(tag: s.text(0), count: s.int(1))) }
        return out
    }

    /// Notes carrying a tag (exact or as a parent of a nested tag).
    public func paths(withTag tag: String) throws -> [String] {
        let s = try db.prepare(
            "SELECT DISTINCT rel_path FROM tags WHERE tag = ? OR tag LIKE ? ORDER BY rel_path")
        s.bindAll([.text(tag), .text(tag + "/%")])
        var out: [String] = []
        while s.step() { out.append(s.text(0)) }
        return out
    }

    private func paths(withAnyTag tags: [String]) throws -> Set<String> {
        var set: Set<String> = []
        for t in tags { set.formUnion(try paths(withTag: t)) }
        return set
    }

    // MARK: - Helpers

    /// Build a safe FTS5 MATCH expression: word/CJK tokens, prefix-matched,
    /// ANDed. Returns nil when there's nothing searchable (caller lists all).
    func ftsMatchExpression(_ text: String) -> String? {
        let cleaned = text.replacingOccurrences(
            of: "[^\\p{L}\\p{N}_ ]", with: " ", options: .regularExpression)
        let tokens = cleaned.split(whereSeparator: { $0.isWhitespace }).map(String.init)
        if tokens.isEmpty { return nil }
        return tokens.map { "\($0)*" }.joined(separator: " AND ")
    }
}

private func stripMarkdownExtension(_ s: String) -> String {
    s.replacingOccurrences(
        of: "\\.(md|markdown|mdx|mkd)$", with: "", options: [.regularExpression, .caseInsensitive])
}

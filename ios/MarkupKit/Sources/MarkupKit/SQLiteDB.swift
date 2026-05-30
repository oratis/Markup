import Foundation
import SQLite3

// Tell SQLite to copy bound text/blob (the Swift string may be transient).
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

enum SQLiteError: Error, CustomStringConvertible {
    case open(String), prepare(String), exec(String)
    var description: String {
        switch self {
        case .open(let m): return "sqlite open: \(m)"
        case .prepare(let m): return "sqlite prepare: \(m)"
        case .exec(let m): return "sqlite exec: \(m)"
        }
    }
}

/// Minimal wrapper over the system SQLite3 C API. Not thread-safe; use one
/// instance per queue/actor.
final class SQLiteDB {
    private var handle: OpaquePointer?

    init(path: String) throws {
        if sqlite3_open(path, &handle) != SQLITE_OK {
            throw SQLiteError.open(String(cString: sqlite3_errmsg(handle)))
        }
    }

    deinit { sqlite3_close(handle) }

    /// Run one or more semicolon-separated statements with no bindings.
    func exec(_ sql: String) throws {
        var err: UnsafeMutablePointer<CChar>?
        if sqlite3_exec(handle, sql, nil, nil, &err) != SQLITE_OK {
            let msg = err.map { String(cString: $0) } ?? "unknown"
            sqlite3_free(err)
            throw SQLiteError.exec(msg)
        }
    }

    func prepare(_ sql: String) throws -> Stmt {
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(handle, sql, -1, &stmt, nil) != SQLITE_OK {
            throw SQLiteError.prepare(String(cString: sqlite3_errmsg(handle)))
        }
        return Stmt(stmt!)
    }

    /// Prepare, bind, and run a write statement to completion.
    func run(_ sql: String, _ binds: [SQLiteValue]) throws {
        let s = try prepare(sql)
        s.bindAll(binds)
        s.run()
    }
}

enum SQLiteValue {
    case text(String), double(Double), int(Int)
}

final class Stmt {
    private let stmt: OpaquePointer
    init(_ s: OpaquePointer) { stmt = s }
    deinit { sqlite3_finalize(stmt) }

    func bindAll(_ values: [SQLiteValue]) {
        for (i, v) in values.enumerated() {
            let idx = Int32(i + 1)
            switch v {
            case .text(let t): sqlite3_bind_text(stmt, idx, t, -1, SQLITE_TRANSIENT)
            case .double(let d): sqlite3_bind_double(stmt, idx, d)
            case .int(let n): sqlite3_bind_int64(stmt, idx, Int64(n))
            }
        }
    }

    /// Step once expecting a row; returns whether a row is available.
    func step() -> Bool { sqlite3_step(stmt) == SQLITE_ROW }

    /// Step once for a write statement (ignores result).
    func run() { _ = sqlite3_step(stmt) }

    func text(_ col: Int32) -> String {
        sqlite3_column_text(stmt, col).map { String(cString: $0) } ?? ""
    }
    func double(_ col: Int32) -> Double { sqlite3_column_double(stmt, col) }
    func int(_ col: Int32) -> Int { Int(sqlite3_column_int64(stmt, col)) }
}

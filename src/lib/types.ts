export interface LoadedFile {
  path: string;
  content: string;
  mtime_ms: number;
}

export interface VaultOpened {
  root: string;
  file_count: number;
}

export interface VaultFile {
  path: string;
  rel_path: string;
  name: string;
  mtime_ms: number;
  size: number;
}

export interface SearchHit {
  path: string;
  title: string;
  mtime_ms: number;
  score: number;
}

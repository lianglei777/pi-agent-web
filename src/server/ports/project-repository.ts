export interface ProjectRepository {
  exists(): Promise<boolean>;
  list(): Promise<string[]>;
  replace(paths: string[]): Promise<void>;
  add(path: string): Promise<void>;
  remove(path: string): Promise<void>;
}

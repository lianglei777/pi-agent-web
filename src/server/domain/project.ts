export interface Project {
  path: string;
}

export interface ProjectDirectory {
  name: string;
  path: string;
}

export interface ProjectBrowseResult {
  current: string;
  parent: string | null;
  roots: string[];
  breadcrumbs: ProjectDirectory[];
  directories: ProjectDirectory[];
}

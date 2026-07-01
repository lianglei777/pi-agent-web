import type { SuccessResponse } from "./common";

export interface Project {
  path: string;
  aliases: string[];
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

export type ListProjectsResponse = Project[];
export interface AddProjectRequest {
  path: string;
}
export type AddProjectResponse = Project;
export type RemoveProjectResponse = SuccessResponse;
export type BrowseProjectsResponse = ProjectBrowseResult;

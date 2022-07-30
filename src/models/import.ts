import { User } from './user';
import { Project } from './project';
import { Task } from './task';
import { ProjectToUser } from './project_to_user';

export const user = User;
export const project = Project;
export const task = Task;
export const project2user = ProjectToUser;
export type types = {
    user: User
    project: Project
    task: Task
    project2user: ProjectToUser
}

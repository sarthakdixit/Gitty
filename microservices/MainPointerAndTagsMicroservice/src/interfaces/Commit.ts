export interface IAuthor {
  email: string;
  timestamp: Date;
}

export interface ICommit {
  tree: string;
  parents: string[];
  author: IAuthor;
  committer: IAuthor;
  message: string;
}

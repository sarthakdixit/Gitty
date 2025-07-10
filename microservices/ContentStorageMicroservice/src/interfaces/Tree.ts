export interface ITreeEntry {
  mode: string;
  type: "blob" | "tree";
  hash: string;
  name: string;
}

export interface ITree {
  entries: ITreeEntry[];
}

export interface NavigationState {
  route: string;
  scrollPosition: number;
}

export interface ScrollHistory {
  [key: string]: number;
}

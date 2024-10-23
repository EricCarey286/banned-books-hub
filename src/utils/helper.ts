export function getOffset(currentPage: number, listPerPage: number): number {
  return (currentPage - 1) * listPerPage;
}

export function emptyOrRows(rows: any[]): any[] {
  if (!rows) {
    return [];
  }
  return rows;
}
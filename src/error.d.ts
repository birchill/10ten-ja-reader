interface ErrorConstructor {
  isError(error: unknown): error is Error;
}

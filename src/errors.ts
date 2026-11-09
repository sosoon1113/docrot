/** An expected failure caused by user input: a bad path, config file or option. */
export class DocrotError extends Error {
  override name = "DocrotError";
}

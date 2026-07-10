/** Dark-red bold asterisk for mandatory form fields. */
export function RequiredMark() {
  return (
    <span
      className="ml-0.5 font-bold text-red-800"
      title="Required"
      aria-hidden="true"
    >
      *
    </span>
  );
}

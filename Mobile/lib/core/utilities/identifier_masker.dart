/// Masks all but the last four characters of sensitive identifiers.
String maskSensitiveIdentifier(String value) {
  if (value.length <= 4) {
    return '*' * value.length;
  }

  final visible = value.substring(value.length - 4);
  return '${'*' * (value.length - 4)}$visible';
}

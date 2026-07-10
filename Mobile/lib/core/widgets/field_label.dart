import 'package:flutter/material.dart';

/// Dark-red bold color for mandatory field asterisks (matches React `text-red-800`).
const Color kRequiredMarkColor = Color(0xFF991B1B);

/// Builds an [InputDecoration] label with a dark-red bold `*` when [required] is true.
Widget buildFieldLabel(String text, {bool required = false}) {
  if (!required) {
    return Text(text);
  }

  return Text.rich(
    TextSpan(
      children: [
        TextSpan(text: text),
        const TextSpan(
          text: ' *',
          style: TextStyle(
            color: kRequiredMarkColor,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    ),
  );
}

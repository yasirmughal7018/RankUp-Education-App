# Implement Partial Marks for Multiple Choice, Match and Order Questions

Update the automatic quiz evaluation logic to support **partial marks** for the following question types:

* Multiple Choice
* Match
* Order

## 1. Partial Correct Answer

These question types can contain multiple answer components, and a student's answer may be partially correct.

The system must calculate the percentage of correctly answered components and award marks proportionally.

### Formula

```text
Correct Percentage =
(Correct Components / Total Components) × 100
```

```text
Calculated Marks =
Question Maximum Marks × (Correct Components / Total Components)
```

The final awarded marks must always be **rounded down**.

Use floor/truncation behavior:

```text
1.0 → 1
1.5 → 1
1.9 → 1
2.0 → 2
```

Do NOT use normal mathematical rounding.

---

## 2. Multiple Choice Example

Question:

```text
Question Marks = 2
Total Options/Answers Required = 2
```

Correct answers:

```text
A = Correct
B = Correct
```

Student selects:

```text
A = Correct
B = Wrong
```

Calculation:

```text
Correct Components = 1
Total Components = 2

Correct Percentage = 1 / 2 × 100
                  = 50%

Calculated Marks = 2 × 50%
                 = 1
```

Award:

```text
1 / 2 marks
```

---

## 3. Decimal Example

If:

```text
Question Maximum Marks = 3
Correct Components = 1
Total Components = 2
```

Then:

```text
Calculated Marks =
3 × (1 / 2)
= 1.5
```

Because marks must be rounded down:

```text
Awarded Marks = 1
```

Never award `2` marks in this case.

---

## 4. Fully Correct

If all components are correct:

```text
Correct Components = Total Components
```

Award the full question marks.

Example:

```text
Question Marks = 2
Correct = 2
Total = 2

Awarded = 2
```

---

## 5. Completely Incorrect

If no components are correct:

```text
Correct Components = 0
```

Award:

```text
0 marks
```

---

## 6. Match Questions

For `Match` questions:

* Evaluate each matching pair independently.
* Count how many pairs are correct.
* Calculate the correct percentage.
* Award proportional marks.
* Round the final marks down.

Example:

```text
Question Marks = 4
Total Matches = 4
Correct Matches = 3

Percentage = 3 / 4 × 100
           = 75%

Marks = 4 × 75%
      = 3

Awarded = 3
```

Another example:

```text
Question Marks = 5
Total Matches = 4
Correct Matches = 3

Marks = 5 × (3 / 4)
      = 3.75

Awarded = 3
```

---

## 7. Order Questions

For `Order` questions:

* Evaluate each required position/component.
* Count correctly positioned items.
* Calculate the percentage of correctly positioned items.
* Award proportional marks.
* Round the final marks down.

Example:

```text
Question Marks = 4
Total Items = 4
Correct Positions = 3

Marks = 4 × (3 / 4)
      = 3

Awarded = 3
```

If:

```text
Question Marks = 5
Total Items = 4
Correct Positions = 3

Marks = 5 × (3 / 4)
      = 3.75

Awarded = 3
```

---

## 8. Important: Define the Total Components Correctly

Do not blindly use the number of answer options.

The evaluation logic must determine the actual number of **scorable answer components** for each question type.

For example:

### Multiple Choice

Depending on the existing question configuration:

```text
Total Components = number of expected selectable answers
```

### Match

```text
Total Components = number of required matching pairs
```

### Order

```text
Total Components = number of items that must be placed correctly
```

Use the existing question configuration/model to determine this.

---

## 9. Do Not Double-Count

For Multiple Choice questions, carefully distinguish between:

* Available options
* Correct options
* Selected options
* Correctly selected options
* Incorrectly selected options
* Missing correct options

The partial-credit calculation must follow the existing business definition of the question.

Do not simply count every option as a component if the question expects multiple selections.

---

## 10. Evaluation Result

The evaluation should produce at least:

```text
MaximumMarks
CorrectComponents
TotalComponents
CorrectPercentage
AwardedMarks
```

Example:

```text
Maximum Marks:     3
Total Components:  2
Correct Components: 1
Correct Percentage: 50%
Calculated Marks:   1.5
Awarded Marks:      1
```

If the existing model already contains equivalent fields, reuse them instead of creating duplicates.

---

## 11. Existing Automatic Evaluation Rules

Keep the previously defined rules unchanged:

### Automatically evaluated

Questions with objectively determinable answers should be automatically evaluated.

For:

```text
Multiple Choice
Match
Order
```

support both:

```text
Fully Correct
Partially Correct
Incorrect
```

### Fill in the Blanks

Continue using the existing:

* Accepted Answers
* Case Sensitive
* Allow Partial Match
* Allow AI Review
* Allow Teacher Review

A full accepted-answer match can be automatically marked correct.

A non-full match should follow the configured AI/Teacher review process.

### Essay

Do not automatically mark Essay answers as correct based only on a predefined answer.

Use the configured AI/Teacher review workflow.

---

## 12. Rounding Rule

This is mandatory:

```text
FinalAwardedMarks = Math.Floor(CalculatedMarks)
```

Do not use:

```text
Math.Round()
```

Do not use normal rounding.

Examples:

```text
1.1 → 1
1.4 → 1
1.5 → 1
1.9 → 1
2.0 → 2
2.9 → 2
3.0 → 3
```

---

## 13. Implementation Requirements

Before changing the code, inspect the existing:

* Question Type model
* Question/Option model
* Correct Answer model
* Student Answer model
* Multiple Choice evaluation
* Match evaluation
* Order evaluation
* Quiz completion flow
* Automatic grading service
* Marks calculation
* AI/Teacher review workflow

Reuse the existing evaluation architecture.

Create a common partial-credit calculation method/service if appropriate rather than duplicating the same percentage/rounding logic in Multiple Choice, Match, and Order.

Do not change unrelated Quiz functionality.

Add/update unit tests covering:

1. Fully correct Multiple Choice.
2. Partially correct Multiple Choice.
3. Completely incorrect Multiple Choice.
4. Fully correct Match.
5. Partially correct Match.
6. Fully correct Order.
7. Partially correct Order.
8. Decimal calculated marks.
9. `1.5 → 1`.
10. `1.9 → 1`.
11. Exact integer marks remain unchanged.
12. Zero correct components produce zero marks.
13. Existing Fill in the Blanks behavior remains unchanged.
14. Existing Essay review behavior remains unchanged.

Finally run:

```text
ESLint
TypeScript build
Unit tests
```

Ensure the implementation does not introduce regressions.

## Follow-up 2026-08-30 — slot alignment

Matching/Ordering must keep empty slots as `0` (do not drop zeros or Distinct those lists). Unmatched pair 2 must not shift pair 3 onto pair 2. See QZ-30.

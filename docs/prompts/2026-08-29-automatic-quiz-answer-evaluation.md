Below is a precise Codex prompt that keeps the logic focused on **automatic answer checking**, especially the special handling for **Fill in the Blanks**.

# Implement Automatic Quiz Answer Evaluation

Update the Quiz completion/evaluation logic according to the following rules.

## 1. General Automatic Checking

When a quiz is completed:

* Questions that have a predefined correct answer should be checked automatically.
* All applicable question types should be auto-evaluated.
* **Exception:** `Fill in the Blanks` and `Essay` require the special rules described below.
* Do not change the existing question/answer data model unless required.

## 2. Fill in the Blanks

For `Fill in the Blanks`, check the student's answer against the question's configured **Accepted Answers**.

The question configuration contains:

* `Case Sensitive`
* `Allow Partial Match`
* `Allow AI Review`
* `Allow Teacher Review`

### Fully Matching Answer

If the student's answer fully matches one of the configured Accepted Answers:

* Automatically mark the answer as **Correct**.
* Automatically award the configured marks.
* No AI or Teacher review is required.

### Non-Matching Answer

If the student's answer does NOT fully match any Accepted Answer:

* Do NOT automatically mark it as Correct.
* Do NOT automatically award full marks.
* Keep the answer available for further review according to the configuration.

## 3. Case Sensitive

Respect the question's `Case Sensitive` configuration.

If:

```text
Case Sensitive = true
```

Then:

```text
Accepted Answer: London
Student Answer: london
```

must NOT be considered a full match.

If:

```text
Case Sensitive = false
```

Then:

```text
Accepted Answer: London
Student Answer: london
```

may be considered a full match.

Do not apply case-insensitive comparison when `Case Sensitive` is enabled.

## 4. Allow Partial Match

Respect `Allow Partial Match`.

If:

```text
Allow Partial Match = false
```

Only a full match with an Accepted Answer can be automatically marked correct.

If:

```text
Allow Partial Match = true
```

The existing partial-match rules should be applied.

However, a partial match must NOT be treated as a full automatic correct answer unless the existing business rules explicitly define it as such.

## 5. AI Review

Respect:

```text
Allow AI Review
```

If the answer does not fully match an Accepted Answer and:

```text
Allow AI Review = true
```

the answer should be available for AI review.

AI review must not override a confirmed exact/full match.

## 6. Teacher Review

Respect:

```text
Allow Teacher Review
```

If the answer does not fully match an Accepted Answer and:

```text
Allow Teacher Review = true
```

the answer should be available for Teacher review.

## 7. Essay

`Essay` questions must NOT be automatically marked correct based on a predefined answer.

They should remain available for the configured review process:

* AI Review, if enabled.
* Teacher Review, if enabled.

## 8. Evaluation Priority

Use this evaluation order:

```text
Quiz Completed
      │
      ▼
Evaluate Question Type
      │
      ├── Essay
      │     └── AI/Teacher Review according to configuration
      │
      ├── Fill in the Blanks
      │     │
      │     ├── Full match
      │     │     └── Automatically Correct
      │     │
      │     └── No full match
      │           └── AI/Teacher Review according to configuration
      │
      └── Other question types with predefined answers
            └── Automatically Evaluate
```

## 9. Important

Before implementing, inspect the existing:

* Question Type model
* Accepted Answer model/configuration
* Fill in the Blanks configuration
* Answer evaluation service
* Quiz completion logic
* Auto-grading logic
* AI review logic
* Teacher review logic

Reuse the existing architecture and services wherever possible.

Do not duplicate evaluation logic.

Do not change unrelated Quiz functionality.

Add or update tests covering:

1. Exact match + Case Sensitive = true.
2. Different case + Case Sensitive = true → not automatically correct.
3. Different case + Case Sensitive = false → full match.
4. Exact accepted answer → automatically correct.
5. Non-matching answer → not automatically correct.
6. Partial match behavior.
7. `Allow AI Review`.
8. `Allow Teacher Review`.
9. Essay is not automatically marked correct.
10. Existing question types with predefined answers continue to be automatically evaluated.

After implementation, run the TypeScript build, ESLint, and relevant tests.

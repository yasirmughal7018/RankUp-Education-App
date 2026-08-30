# Fix Quiz Visibility and Approval Logic

Update the Quiz module according to the following business rules.

## Current Problem

* Admin Portal created 2 quizzes.
* School Admin (AES) created 1 quiz.
* All 3 quizzes are published.
* Admin Portal correctly sees all 3 quizzes.
* AES Admin only sees its own quiz — **wrong**.
* ISL Admin sees no quizzes because it did not create any — **wrong**.

## Required Quiz Visibility

Published quizzes must be visible to authorized users based on their school/role scope, not only by `CreatedBy`.

* Admin Portal → See all published quizzes.
* School Admin → See all published quizzes belonging to their school, regardless of creator.
* Campus Admin → See all published quizzes belonging to their campus/school scope.
* Coordinator → See published quizzes within their assigned school/campus scope.
* Teacher → See published quizzes available within their assigned school/campus/classes.
* Tutor → See published quizzes available within their assigned scope.
* Parent → See published quizzes available to their children.
* Student → See published quizzes assigned/available to them.

Do **not** filter published quizzes only by `CreatedBy`.

## Quiz Creation

The following roles can create and publish quizzes according to permissions:

* Admin Portal
* School Admin
* Campus Admin
* Coordinator
* Teacher
* Tutor
* Parent

## Unpublished Quiz Rules

A quiz that is not published:

* Cannot be assigned to students/children.
* Cannot be used by students.
* Can only be edited/removed by Admin Portal or the quiz owner.
* If created by Teacher or Coordinator:

  * School Admin or Campus Admin can review/approve it.
  * Admin Portal has final authority to publish it.

## Published Quiz Rules

Once published:

* Admin Portal can edit/manage the quiz.
* The owner cannot directly modify the published quiz.
* The owner can request changes.
* Admin Portal reviews and approves/rejects the requested changes.
* Published quizzes can be assigned/used according to their scope and permissions.

## Important

Fix the existing authorization/query logic so visibility is based on:

* Role
* SchoolId
* CampusId
* Assignment/scope
* Quiz publication/approval status

Do not use `CreatedBy` as the only visibility condition.

After implementation, verify this scenario:

1. Admin Portal creates Quiz A and Quiz B.
2. AES School Admin creates Quiz C.
3. All three are published.
4. Admin Portal sees A, B, C.
5. AES Admin sees all published quizzes belonging to AES, including quizzes not created by AES.
6. ISL Admin sees all published quizzes belonging to ISL, even if another authorized user created them.
7. Users outside the applicable school/campus scope cannot see those quizzes.

Preserve existing functionality and do not change unrelated Quiz features.

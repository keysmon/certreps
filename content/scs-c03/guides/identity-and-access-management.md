# Identity and Access Management on AWS (SCS-C03 Domain 4)

*Verified Q3 2026 - covers 20% of the SCS-C03 exam, its single largest domain.*

## What this domain tests

Identity and Access Management is the heaviest-weighted domain on SCS-C03, and it is also the domain where specialty-level questions most often hinge on precise mechanics rather than surface familiarity.
The exam expects you to trace exactly how AWS evaluates a request across several policy types at once, to know which mechanisms grant access and which only restrict it, to design cross-account access safely, and to use IAM Access Analyzer to find both over-exposed resources and unused permissions.
Getting the conceptual model wrong here (for example, assuming an SCP grants something, or that a permission boundary adds capability) is the single most common way to lose points across the whole exam.

## How AWS evaluates a request

Every authorization decision follows a strict, deterministic order, and the exam rewards knowing it cold rather than reasoning from intuition.
**An explicit Deny in any applicable policy type, identity-based, resource-based, permission boundary, or service control policy, always overrides any Allow, no matter how many Allow statements also apply.**
Counting up Allow statements never wins against a single Deny; evaluation is not a majority vote.
Within a single account with no organization involved, **resource-based policies and identity-based policies are evaluated together, and either can independently grant access**; neither type categorically outranks the other, so a bucket policy allowing an action is just as valid a grant as an identity policy allowing it, and a conflict between the two is resolved by the same deny-overrides-allow rule as everything else.
Absent any explicit statement, the default is implicit deny, so access requires at least one applicable Allow to exist somewhere in the policies that apply to the request.

## Service control policies set a ceiling, they never grant

**A service control policy (SCP) attached to an account, OU, or the Organizations root defines the maximum permissions available to every principal in that account; it never grants a permission by itself.**
If an SCP's effective allow-list omits an action, such as every DynamoDB action, then no identity-based policy inside that account can restore access to it, no matter how permissive that identity policy looks in isolation.
This is the classic specialty-level trap: a question shows a generous identity policy and asks whether a call succeeds, and the correct read requires checking the SCP ceiling first, because the identity policy is powerless to punch through it.
SCPs apply to every principal in an affected account, including the root user, not only to IAM users and roles, and they do not retroactively revoke a request already granted through the normal evaluation of the other policy types; they simply remove disallowed actions from the pool of what a policy elsewhere in the account could ever grant.

## Permission boundaries: intersection, never expansion

**A permission boundary is a managed policy that sets the maximum permissions an identity can have, and the identity's effective permissions are always the intersection of what its identity-based policies grant and what the permission boundary allows.**
If an identity's own policy grants full S3 access but its permission boundary allows only s3:GetObject and s3:ListBucket, the developer can only perform those two actions; the boundary narrows the identity policy down to the overlap, it does not subtract the overlap and it does not expand the identity policy's reach beyond what that policy already allows.
A permission boundary attaches to one specific IAM user or role, which is the key structural difference from an SCP: an SCP attaches at the OU, account, or Organizations-root level and sweeps in every principal there, while a boundary is scoped to the individual identity it is attached to.
Treating the two as interchangeable, or assuming either one can grant something beyond what an identity policy already allows, is a reliable way to miss a specialty-level question.

## Cross-account access and the confused deputy problem

Granting another AWS account the ability to assume a role in yours is routine, but it opens a specific risk: if the trusting role's ARN becomes known or reused across many of the assuming party's own customers, an unrelated third party could trick that party's systems into assuming your role on the third party's behalf.
**The documented mitigation is the ExternalId condition: the trusted account assigns the assuming party a unique, secret ExternalId value, and the role's trust policy requires sts:ExternalId to match that value on every AssumeRole call, so a third party who only knows the role ARN, but not the specific ExternalId, cannot successfully assume the role even if tricked into trying.**
Once a role is assumed and temporary credentials are issued, changing the trust policy's ExternalId has no retroactive effect, because ExternalId is checked only at the moment of the AssumeRole call, not on every subsequent action taken with the resulting session.
If those temporary credentials are ever compromised while still valid, the way to invalidate every active session immediately, before natural expiration, is to attach or update a policy on the role that denies access based on the aws:TokenIssueTime condition key set to the current time, since every subsequent API call with temporary credentials is evaluated against the role's policies at request time.

## IAM Access Analyzer: two different questions, two different analyzer types

IAM Access Analyzer answers two distinct governance questions, and the exam treats them as separate capabilities rather than one generic tool.
**External access analyzer findings continuously analyze the resource-based policies of supported resource types, such as S3 buckets, KMS keys, IAM roles, and SQS queues, and generate a finding whenever a resource is reachable from outside the account or the configured zone of trust**, which answers "what have we exposed."
**A separate unused access analyzer type continuously reviews IAM roles and users and generates findings for unused permissions, unused access keys, and unused passwords over a configurable tracking period**, which answers a completely different question: "what have we over-granted internally that nobody is using."
Neither analyzer type substitutes for the other, and no other service duplicates either function: AWS Config evaluates configuration against rules but does not perform this kind of policy-reachability or usage analysis, and Amazon Inspector scans workloads for software vulnerabilities, not IAM policy exposure or usage.

## Condition keys for context-aware access control

Several global condition keys let a policy react to the context of a request rather than only to the principal and action.
**aws:MultiFactorAuthPresent evaluates to true only when the requester's current session was established with multi-factor authentication**, so gating a sensitive action, such as deleting a bucket, behind this condition enforces MFA specifically for that action; it is not the same as aws:SecureTransport, which only checks that the connection used HTTPS and says nothing about authentication strength.
**aws:PrincipalOrgID restricts access to any principal whose account belongs to a specified AWS Organization, matching by organization ID rather than requiring an explicit, maintained list of every member account**, which is the standard way to write a resource policy that trusts "anyone in my org" without hardcoding account numbers as the organization grows.

## Federation removes per-user IAM management

**Registering a corporate identity provider that supports SAML 2.0 as an identity provider in IAM lets employees authenticate once against their existing corporate credentials and federate into AWS through AssumeRoleWithSAML, or SAML-based console sign-in, to receive short-lived, role-scoped temporary credentials, with no per-employee IAM user ever created.**
This is the default answer whenever a scenario already has a corporate directory and wants AWS access without provisioning and password-syncing an IAM user for every employee; attaching AWS permissions directly to a directory group has no effect on its own, since AWS still needs the SAML trust relationship and an assumable role to translate that group membership into AWS credentials.

## Practice this domain

Take a [Domain 4 drill](/aws/scs-c03/practice?mode=drill&domain=Identity%20and%20Access%20Management)
or the [full SCS-C03 mock exam](/aws/scs-c03/practice?mode=mock).

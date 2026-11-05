# Federated Access and Temporary AWS Credentials

Reviewed 2026-11-05. This optional implementation lesson uses original teaching examples. It is not an AWS answer key.

## Separate the three security decisions

Authentication establishes who signed in. Federation lets AWS trust a configured external identity provider. Authorization determines which AWS actions and resources a resulting session may use. A valid application JWT is not automatically permission to invoke a Bedrock model.

For an application whose signed-in users need AWS credentials, a Cognito identity pool can exchange trusted identity-provider evidence for temporary credentials with scoped IAM permissions. A Cognito user pool handles application sign-in and tokens; it is not itself the identity-pool credential exchange. Workforce access through IAM Identity Center is a different access pattern. Choose the mechanism for the caller and application, rather than treating all federation services as interchangeable.

## Read both sides of a role assumption

The role trust policy determines who may assume it and under what conditions. Its permissions policy constrains what the assumed session can do. For an identity-pool role, scope trust to the intended pool and authenticated identities. For direct web-identity federation, validate the intended provider, audience and subject conditions. Merely granting a model action does not repair a trust-policy failure.

Temporary credentials include a session token as well as the access key and secret. AWS SDK credential providers can obtain and refresh sessions and sign supported AWS requests. Storing a long-lived IAM user's keys in a browser defeats the requirement to remove static credentials. Increasing token lifetime also does not repair an authorization problem.

## Try it

On paper, trace a fictional contractor portal from corporate sign-in through credential exchange to one permitted Bedrock model. Label the token issuer, AWS trust decision, IAM role, session expiration and model resource. Now suppose one user signs in successfully but cannot assume the role. Identify the trust conditions to inspect before changing model permissions. Then suppose role assumption succeeds but model invocation is denied; trace the effective permissions and resource scope instead.

## Check your reasoning

- Does successful OIDC login alone authorize a Bedrock request? No; the AWS credential and authorization path still matters.
- Can a broad role permissions policy compensate for an untrusted principal? No; the trust decision is a separate prerequisite.
- Should every federation failure be solved by adding another IAM user? No; preserve temporary sessions and investigate the failed boundary.

Sources: [Cognito identity pools](https://docs.aws.amazon.com/cognito/latest/developerguide/getting-started-with-identity-pools.html), [IAM federation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers.html).

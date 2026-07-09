# Design Secure Architectures on AWS (SAA-C03 Domain 1)

*Verified Q3 2026 - covers ~30% of the SAA-C03 exam, the largest single domain.*

## What this domain tests

Design Secure Architectures is the biggest domain on the SAA-C03 exam, and it is also the most cross-cutting: every other domain assumes the security foundations covered here.
It spans identity and access management, network isolation, encryption of data at rest and in transit, and the detective and preventive controls that let a team notice and stop a problem before it becomes an incident.
The exam rewards knowing not just what a service does, but which of several plausible-sounding services is the *right* tool for a specific constraint - no long-term credentials, no inbound ports, automatic key rotation, cross-account access, and so on.

## Identity: roles over long-term keys

The single most tested idea in this domain is that workloads should use temporary credentials, not long-term access keys.
**An IAM role attached to an EC2 instance through an instance profile** lets an application call AWS APIs using credentials that the instance retrieves automatically and that rotate behind the scenes, so no access key ever needs to be stored on disk or in code.
The same pattern extends across accounts: **a cross-account IAM role with a trust policy naming another account's principal** lets a partner call AWS STS AssumeRole for short-lived, scoped credentials, instead of receiving an access key by email or, worse, root credentials.
**An IAM permissions boundary attached to a principal caps the maximum permissions any role that principal creates can have**, even if that principal's own identity-based policy tries to grant more, which is how a platform team safely delegates role creation to application teams without losing control of the ceiling.
When many teams need least-privilege policies but existing ones have drifted too broad, **IAM Access Analyzer's policy generation feature reviews a role's actual CloudTrail activity and proposes a policy containing only the permissions actually used**, and **Access Analyzer's cross-account findings flag any resource, such as an S3 bucket or an IAM role, that is reachable from outside the account or organization**, which is the automated way to catch accidental external exposure across dozens of buckets without reading every policy by hand.

## Federating human and application identities

Two different Amazon Cognito building blocks solve two different problems, and the exam likes to test the difference.
**A Cognito user pool handles sign-up, sign-in, and the user directory** for an application's own end users.
**A Cognito identity pool federates an authenticated identity, whether from a user pool or an external IdP, into temporary AWS credentials scoped by IAM role**, which is what actually lets a mobile app call S3 or DynamoDB directly.
Neither one substitutes for the other: a user pool alone has no mechanism to hand out AWS credentials, and an identity pool alone has no sign-up or password management.
For workforce access into multiple AWS accounts, the analogous service is **AWS IAM Identity Center (the successor to AWS SSO), which connects to an existing identity source such as Active Directory and uses permission sets to federate employees into the accounts they are authorized for with a single sign-on**, removing the need for a duplicated IAM user in every account.

## Layered network security

Security groups and network ACLs look similar but behave very differently, and this distinction is one of the most reliable discriminator questions in the domain.
**Security groups are stateful**: an inbound rule that allows traffic automatically allows the matching return traffic, with no outbound rule required.
**Network ACLs are stateless**: an inbound allow rule does nothing for the return trip, so an explicit outbound rule permitting the client's ephemeral port range is required, or replies get silently dropped even though the request got through.
Layering both, plus **an AWS WAF web ACL on the load balancer to filter common web exploits such as SQL injection and cross-site scripting**, is the textbook defense-in-depth answer for a public web tier: restrict the security group to only the load balancer, keep NACLs as a coarse subnet-level backstop, and filter at the application layer with WAF.
For east-west access into AWS services without touching the public internet, **a gateway VPC endpoint for S3 or DynamoDB adds a private route with no hourly or per-GB endpoint charge**, while other services use **interface endpoints, which use PrivateLink and do carry an hourly and per-GB cost**.
And for operational access to instances in private subnets, **AWS Systems Manager Session Manager connects over an outbound HTTPS session through the SSM Agent, with no inbound port opened, no bastion host, and no SSH key to manage**, which is why it has largely displaced the bastion-host pattern on the exam.

## Encrypting data at rest and in transit

**SSE-KMS with a customer-managed CMK lets decrypt access be controlled and audited through the key's own policy and grants**, independent of whatever the S3 bucket policy allows, which matters whenever a requirement calls for separately auditable or revocable decrypt permissions.
That is different from SSE-S3, which encrypts data but uses AWS-owned keys that cannot be managed or revoked through a customer-controlled key policy.
For credentials, **AWS Secrets Manager supports built-in automatic rotation for RDS and several other database engines using an AWS-managed Lambda rotation function**, so passwords rotate on a schedule with no code change beyond fetching the current secret; Systems Manager Parameter Store SecureString values are encrypted but have no rotation workflow of their own.
For TLS on a public endpoint, **AWS Certificate Manager issues public certificates at no charge and automatically renews certificates attached to integrated services such as an Application Load Balancer listener**, removing the manual renewal a third-party certificate would require.

## Detecting problems and reacting automatically

**Amazon GuardDuty analyzes VPC Flow Logs, DNS logs, and CloudTrail events for threat indicators**, such as an instance communicating with a known command-and-control address, and the highest-value pattern the exam tests is closing the loop: **an Amazon EventBridge rule that matches a specific GuardDuty finding type and invokes a Lambda function** can isolate the affected instance's security group within seconds, with no human in the loop.
**AWS Config continuously evaluates managed or custom rules against resource configuration**, such as whether every EBS volume is encrypted, and flags violations as they happen, which is a different job from CloudTrail: **CloudTrail records the history of API calls for audit and troubleshooting, but it does not evaluate configuration against a rule the way Config does.**
For raw network visibility, **VPC Flow Logs record accepted and rejected IP traffic metadata at the ENI, subnet, or VPC level**, which is the source of truth when an incident response team needs to know exactly which addresses talked to a given resource.

## S3 access control and data classification

S3 buckets default to private, but a badly written bucket policy or ACL can accidentally open a bucket to the world, so the exam tests both the preventive control and the detective one.
**S3 Block Public Access, enabled at the bucket or account level, overrides any bucket policy or ACL that would otherwise grant public access**, which is why AWS enables it by default on new buckets and recommends leaving it on unless a workload genuinely needs to serve public objects.
For cross-account rather than public sharing, a bucket policy that names a specific partner account as principal, paired with a cross-account IAM role on the partner's side, is the least-privilege way to grant access without ever making the bucket public.
Before sensitive data lands in a bucket that other teams or accounts can reach, **Amazon Macie uses machine learning and pattern matching to discover and classify sensitive data, including PII, across S3**, which is a different job from encryption: KMS and SSE-S3 both protect data in transit and at rest, but neither one tells a team what sensitive data a bucket actually contains.

## Guardrails across accounts

A single account's IAM policies are not a strong enough boundary when many accounts and teams are involved.
**A service control policy (SCP) attached to an organizational unit in AWS Organizations sets the maximum available permissions for every account and every principal within it**, including that account's own administrators, so an SCP that blocks resource creation outside two approved Regions is enforced organization-wide regardless of what any individual account's IAM policies allow.
That is a stronger and more centrally managed guarantee than an IAM permissions boundary, which is set per-principal within a single account and can be changed by that account's own administrators.

## Practice this domain

Take a [Domain 1 drill](/aws/saa-c03/practice?mode=drill&domain=Design%20Secure%20Architectures)

# Network Design on AWS (ANS-C01 Domain 1)

*Verified Q3 2026 - covers ~30% of the ANS-C01 exam.*

**Exam availability checked October 18, 2026:** AWS lists December 31, 2026 as the last day to take ANS-C01. Certifications earned before retirement retain their standard three-year validity. See the [official exam page](https://aws.amazon.com/certification/certified-advanced-networking-specialty/) before booking.

## What this domain tests

Network Design is the largest ANS-C01 domain, and it is also the domain where the exam rewards precision over general familiarity.
The scenarios describe a business requirement - resiliency, throughput, failover behavior, or reachability across accounts and Regions - and ask you to pick the one AWS networking architecture that actually delivers it, not just a plausible-sounding one.
That means knowing the exact guarantees of each Direct Connect resiliency model, the exact limits of transit gateway peering and multicast, and the exact mechanism behind BGP path control, hybrid DNS, and centralized traffic inspection.

## Direct Connect resiliency and link aggregation

The Direct Connect Resiliency Toolkit defines three named models, and the exam expects you to match a requirement to the right one by connection count, device count, and location count, not by vague terms like "redundant."
**Maximum resiliency uses separate connections that terminate on separate devices in more than one location** (a minimum of four connections across two or more locations) and is the only model that reaches the 99.99% SLA while protecting against device, connectivity, and complete location failure at once.
**High resiliency uses one connection per location across two locations** and reaches a 99.9% SLA.
**Development and test uses two connections on separate devices within a single location** and protects against device failure but not location failure.
Link aggregation groups (LAGs) are a separate concept from resiliency: **all connections in a LAG must terminate on the same Direct Connect device and share the same bandwidth**, with a cap of four connections below 100 Gbps or two connections at 100/400 Gbps.
Do not confuse the two: a LAG increases the bandwidth of connections that already share a device, while a resiliency model spreads connections across devices and locations on purpose.

## BGP path control and MACsec

Direct Connect gives you several BGP levers, and the exam tests whether you reach for the right one instead of the first one that comes to mind.
**Local preference community tags (7224:7100 low, 7224:7200 medium, 7224:7300 high) are the recommended way to build active/passive failover or active/active load balancing across virtual interfaces**, and local preference is evaluated before AS_PATH.
AWS explicitly does not recommend relying on MED for this, since MED is evaluated only after prefix length, local preference, and AS_PATH.
On public virtual interfaces, **scope community tags (7224:9100 local Region, 7224:9200 continent, 7224:9300 global) control how far your advertised prefixes propagate inside the Amazon network**, and every route Direct Connect advertises to you carries the NO_EXPORT community, meaning it stays inside the AWS network.
For encryption in transit without an IPsec VPN's overhead, **MACsec (802.1AE) is available only on dedicated connections at MACsec-capable ports and locations**, enabled by associating a CAK/CKN key pair with the connection or with a LAG (only one key is active across all LAG links at a time).

## Transit gateway peering and multicast limits

Two transit gateway behaviors show up repeatedly as discriminator questions because they contradict what people expect from other AWS networking constructs.
**Transit gateway peering is never transitive**: if TGW-A peers with TGW-B and TGW-B peers with TGW-C, a VPC on TGW-A cannot reach a VPC on TGW-C without a direct peering attachment between A and C.
**Routes to a peering attachment are always static**, since peering attachments do not support dynamic route propagation, and inter-Region peering traffic is AES-256 encrypted at the virtual network layer.
Transit gateway multicast has its own hard boundary: **multicast routing works only between subnets in attached VPCs and is not supported over Direct Connect, Site-to-Site VPN, peering attachments, or Connect attachments**, and a transit gateway must be created specifically to support multicast, since it cannot be enabled retroactively.
A related but distinct limitation applies to plain VPC peering: **it is also non-transitive, and it does not support edge-to-edge routing**, so a VPC cannot reach the internet, NAT, VPN, or Direct Connect connection that belongs only to a VPC it peers with.

## Hybrid DNS and multi-Region reach with a single connection

For hybrid DNS, direction is everything: **an outbound Resolver endpoint plus a forwarding rule lets VPC resources query an on-premises domain, while an inbound Resolver endpoint lets on-premises clients query the VPC's Resolver.**
For centralizing that configuration across many accounts, **create the outbound endpoint and forwarding rule once in a shared-services account and share the rule through AWS RAM**, so member accounts only need to associate the shared rule with their own VPCs.
To reach VPCs across multiple Regions using a single Direct Connect connection, **attach a transit virtual interface to a Direct Connect gateway, then associate that gateway with a transit gateway in each Region**, configuring allowed prefixes per association.
Direct Connect gateway associations can also cross accounts: **the transit gateway owner sends the association proposal, and the Direct Connect gateway owner accepts it** (and may adjust the allowed prefixes), never the other way around.

## Centralized inspection, shared VPCs, and prefix lists

For inserting third-party firewall appliances transparently in front of many VPCs, **Gateway Load Balancer centralizes the appliance fleet, and GWLB endpoints deployed in each consumer VPC's subnet, matched to the GWLB's Availability Zone, redirect traffic through GENEVE encapsulation on UDP port 6081** without cross-AZ hops.
For centralizing VPC ownership itself, **VPC subnet sharing through AWS RAM lets an owner account share subnets with participant accounts in the same organization**; participants deploy their own resources into the shared subnets, but only the owner can manage the VPC's route tables, network ACLs, and peering connections, regardless of how broad a participant's own IAM permissions are.
For CIDR ranges that change over time and are referenced in many route tables and security groups, **a customer-managed prefix list centralizes the list once, and AWS RAM can share it across accounts**, so every reference updates automatically instead of requiring manual edits everywhere.

## PrivateLink endpoint services and Direct Connect gateway isolation

Beyond the GWLB pattern, PrivateLink's general endpoint-service model is worth knowing on its own terms: **a provider fronts an application with a Network Load Balancer, publishes it as a VPC endpoint service, and consumer accounts create their own interface VPC endpoints to reach it privately**, with no VPC peering and no exposed IP addresses in either direction.
Enabling an interface endpoint's **private DNS name option, together with the VPC's DNS hostnames and DNS resolution attributes**, makes the service's standard public hostname resolve to the endpoint's private address for callers inside the VPC, so existing SDK code needs no changes.
A related design subtlety concerns Direct Connect gateways: **a Direct Connect gateway does not, by default, allow the gateway associations attached to it to send traffic to each other**, so two VPCs whose virtual private gateways both associate to the same Direct Connect gateway cannot reach each other through it unless a supernet advertised from on-premises deliberately overlaps both VPCs' CIDRs on the same virtual interface.
If you want strict VPC-to-VPC isolation across a shared Direct Connect gateway, provision one Direct Connect gateway per VPC instead of reusing a single gateway for every VPC.

## IPv6, Global Accelerator, and scaling VPN bandwidth

For IPv6 outbound-only access from a private subnet, **an egress-only internet gateway is the IPv6 equivalent of a NAT gateway**, since NAT gateways are IPv4-only; the route table needs a ::/0 entry pointing at the egress-only gateway, not a standard internet gateway, which would make the subnet's globally routable IPv6 addresses reachable from the internet.
For a non-HTTP, multi-Region, low-latency workload such as UDP matchmaking or VoIP, **AWS Global Accelerator provides fixed anycast IP addresses that route traffic onto the AWS global network and fail over automatically between healthy Regional endpoints**, while CloudFront is an HTTP/S content cache and is not the fit for non-HTTP protocols.
To scale Site-to-Site VPN throughput beyond a single tunnel, **equal-cost multi-path routing requires BGP dynamic routing across multiple VPN connections with matching AS_PATH length and attributes**; static routing does not support ECMP this way, and a single connection's two tunnels exist for redundancy, not for bandwidth scaling.

## Practice this domain

Take a [Domain 1 drill](/aws/ans-c01/practice?mode=drill&domain=Network%20Design)
or the [full ANS-C01 mock exam](/aws/ans-c01/practice?mode=mock).

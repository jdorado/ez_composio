# Security

Report vulnerabilities privately through GitHub Security Advisories for this
repository when enabled; do not post keys, enrollment, consent URLs or provider
records in public issues. If private reporting is unavailable, contact the
repository maintainer privately before sharing sensitive details.

The broker holds the project key in its private volume. Client containers receive
only their session bearer credential and private IPC socket. Docker host
administrators are trusted. Do not mount the broker volume in client containers.
Hosted brokers require HTTPS, a private configuration directory readable by UID
1000, and operator-managed rate limiting. Never disable certificate verification.
Revoking a binding prevents new requests; already in-flight provider work can
still finish. Provider disconnection and receipt retention are separate actions.

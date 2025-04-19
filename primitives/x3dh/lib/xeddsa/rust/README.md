# Implementation of the XEdDSA signature algorithm

[XEdDSA] is an Elliptic-Curve signature algorithm designed by the
[Signal] project. [XEdDSA] is designed to use the same Elliptic-Curve
keys both for Diffie-Hellman key exchange and for EdDSA signatures.

The crate is available at [crates.io](https://crates.io/crates/xeddsa)
and the documentation can be found at [docs.rs](https://docs.rs/xeddsa/1.0.2/xeddsa/).

## Features

The following features of the specification are implemented:

- Traits to build concrete implementations for specific curves
- Concrete implementation for XEd25519 (on Curve25519, compatible with [`curve25519-dalek`])

## Origin, maintenance and support

The `xeddsa` crate originated as part of a [Teckids] tinkering project
building offline-finding tags, an experimental system developed as [SpotNuts].
`xeddsa` was factored out as a generic library.

Downstream users of the library are encouraged to review it. Commercial
support for implementations based on the `xeddsa` crate is available
from [velocitux].

The library is licensed under the [Apache 2.0] license.


[XEdDSA]: https://www.signal.org/docs/specifications/xeddsa/
[Signal]: https://signal.org/
[`curve25519-dalek`]: https://crates.io/crates/curve25519-dalek
[Teckids]: https://teckids.org/
[SpotNuts]: https://codeberg.org/SpotNuts/
[velocitux]: https://velocitux.com/
[Apache 2.0]: https://www.apache.org/licenses/LICENSE-2.0

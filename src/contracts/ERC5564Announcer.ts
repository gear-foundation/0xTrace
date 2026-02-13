export const abi = [
  {
    type: "function",
    name: "announce",
    inputs: [
      {
        name: "schemeId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "stealthAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "ephemeralPubKey",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "metadata",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Announcement",
    inputs: [
      {
        name: "schemeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "stealthAddress",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "caller",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "ephemeralPubKey",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
      {
        name: "metadata",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
    anonymous: false,
  },
] as const;

export const address = "0x17Cf80182028b0b1A12aB16265B42a6D10d19BeA";

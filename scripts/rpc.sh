#!/usr/bin/env bash
# Thin JSON-RPC helper for the Portaldot V3 testnet EVM endpoint.
# Usage: rpc.sh <method> [json-params]
# Example: rpc.sh eth_chainId
#          rpc.sh eth_getBlockByNumber '["latest", true]'
set -euo pipefail
RPC="${PORTALDOT_RPC:-https://test-evm-rpc-v3.portaldot.dev}"
METHOD="$1"
PARAMS="${2:-[]}"
curl -sS --max-time 60 -X POST "$RPC" \
  -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$METHOD\",\"params\":$PARAMS}"

#!/bin/sh

# Initialise genesis block
mkdir -p .rnode/genesis
echo "04be064356846e36e485408df50b877dd99ba406d87208add4c92b3c7d4e4c663c2fbc6a1e6534c7e5c0aec00b26486fad1daf20079423b7c8ebffbbdff3682b58 100000000000" > .rnode/genesis/bonds.txt
echo "1111Wbd8KLeWBVsxByF9iksJ4QRRjEF3nq1ScgAw7bMbtomxHsqqd,1000000000000000,0" > .rnode/genesis/wallets.txt

echo "rchain genesis block created"
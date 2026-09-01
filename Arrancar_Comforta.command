#!/bin/bash
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin
source ~/.bash_profile 2>/dev/null
source ~/.zshrc 2>/dev/null
cd /Users/dmo/Documents/GitHub/comforta-cuentas
echo "================================="
echo "   INICIANDO COMFORTA CUENTAS    "
echo "================================="
npm run dev

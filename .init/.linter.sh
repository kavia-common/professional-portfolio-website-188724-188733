#!/bin/bash
cd /home/kavia/workspace/code-generation/professional-portfolio-website-188724-188733/frontend_portfolio
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi


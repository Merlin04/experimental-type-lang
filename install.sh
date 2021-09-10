wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash

# Don't copy + paste this
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

nvm install --lts
nvm use --lts



tput setaf 6;
printf "\n\n"
printf "If running node/nvm doesn't work, run:\n\n"
tput setaf 2;
printf 'export NVM_DIR="$HOME/.nvm" &&\n'
printf '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" &&\n'
printf '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" &&\n'
printf '\nnvm install 12 &&\nnvm use 12\n'
tput setaf 6;
printf '\nOr, just copy and paste the commands inside the script.\n'
tput init

# Copy + paste this, without the : ' and the ending quote

export NVM_DIR="$HOME/.nvm" &&
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" &&
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" &&

nvm install 12 &&
nvm use 12
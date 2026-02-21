const loginComponents = {
    loginUsername : document.querySelector('#login-username'),
    loginPassword : document.querySelector('#login-password'),
    loginBtn : document.querySelector('#login-btn'),
    loginForm : document.querySelector('.login-form')
};

const loginCredentials = [loginComponents.loginUsername, loginComponents.loginPassword];

loginCredentials.forEach(input => {
    input.addEventListener('input', () => {
        const isUsernameEmpty = !loginComponents.loginUsername.value
        const isPasswordEmpty =!loginComponents.loginPassword.value;

        if(!isUsernameEmpty && !isPasswordEmpty) {
            loginComponents.loginBtn.disabled = false;
        }
        else {
            loginComponents.loginBtn.disabled = true;
        }
    })
})


loginComponents.loginBtn.addEventListener('click', (e) =>{
    e.preventDefault();

    loginComponents.loginUsername.disabled = true;
    loginComponents.loginPassword.disabled = true;
    loginComponents.loginBtn.disabled = true;

    document.querySelector('#loading-modal').showPopover();


})





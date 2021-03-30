const protectedPath = (req, res, next) => {
    if (typeof req.session.user_name === 'undefined') {
        res.redirect("user/register");
    } else {
        // console.log("already authenticated in (protected path middleware) " + req.session.user_name);
        next();
    }
};

module.exports = protectedPath;
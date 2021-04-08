const fs = require('fs');

const storageHelper = require('../../storage/helper');

module.exports = {
    getAvailableAvatarNames() {
        return new Promise((resolve, reject) => {
            let avatarImagesNames = [];
            fs.readdir("public/img/avatar-pack/", (err, files) => {
                if (err) {
                    console.log("error in read avatar images names : " + err);
                    reject(err);
                } else {
                    files.forEach(file => {
                        avatarImagesNames.push(file);
                    });

                    resolve(avatarImagesNames);
                }
            });
        });
    },
    getARandomAvatarName() {
        const avatarImages = storageHelper.get("avatar-images");
        let randomPosition = Math.floor(Math.random() * (avatarImages.length - 0 + 1) + 0);

        return avatarImages[randomPosition];
    }
}
const mongoose = require('mongoose')

function connection(url) {
    mongoose.connect(url).then(
        () => console.log("MongoDB Connection Successful")
    ).catch(
        (err) => console.log("ERROR: MongoDB Connection failed!: ", err)
    )
} 

module.exports = connection
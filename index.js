const mongoose=require('mongoose')
const nocache = require('nocache')
require('dotenv').config();


mongoose.connect("mongodb://localhost:27017/")
mongoose.connection.on('connected',()=>{
    console.log("monogo db connected")
})


const express=require('express')
const app = express()
app.use(nocache())
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(express.static('public'))
app.use(express.static('uploads'))

app.use('/assets',express.static('/public/assets'))
app.use('/admin-assets',express.static('/public/admin-assets'))

const userRoute= require('./routes/userRoute')
app.use('/',userRoute)

//for admin routes
const adminRoute= require('./routes/adminRoute')
app.use('/admin',adminRoute)


app.listen(3000,function(){
    console.log('server is running')
})
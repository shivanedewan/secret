//jshint esversion:6
require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose=require("mongoose");
const session=require("express-session")
const passport=require("passport")
const passportLocalMongoose=require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

 
const app = express();
 
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// const encrypt = require('mongoose-encryption')

// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;



app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
  }))

  app.use(passport.initialize())
  app.use(passport.session())

//  adding database
mongoose.set('strictQuery', false);
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
}


const user_schema = new mongoose.Schema({
    email: {
        type: String
      },
  
    password:{
      type: String
    },
    googleId:String,

    secret: String
  });

  user_schema.plugin(passportLocalMongoose);
  user_schema.plugin(findOrCreate);


  
//   user_schema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ['password'] });

const user_model=mongoose.model("User",user_schema);
passport.use(user_model.createStrategy());

// passport.serializeUser(user_model.serializeUser());
// passport.deserializeUser(user_model.deserializeUser());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {

    // console.log(profile)
    user_model.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",(req,res)=>{
    res.render("home")
})
app.get("/login",(req,res)=>{
    res.render("login")
})
app.get("/register",(req,res)=>{
    res.render("register")
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));


  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.get("/secrets",(req,res)=>{
    if (req.isAuthenticated()){

      user_model.find({"secret":{$ne:null}},(err,foundUsers)=>{
        if(err){
          console.log(err)
        }
        else{
          if(foundUsers){
            res.render("secrets",{foundUsers:foundUsers});
          }
          
        }
      })
    }
    else{
        res.redirect("/login")
    }

})

app.get("/submit",(req,res)=>{
  if (req.isAuthenticated()){
      res.render("submit");
  }
  else{
      res.redirect("/login")
  }

})

app.post("/submit",(req,res)=>{
  
  
const submittedContent=req.body.secret;

user_model.findById(req.user.id, (err, foundUser) => {
  if (err) {
    console.log(err);
  } else {
    if (foundUser) {
      foundUser.secret = submittedContent;
      foundUser.save((err) => {
        if (err) {
          console.log(err);
        } else {
          res.redirect(`/secrets`);
        }

      });
    }
  }
})

})




app.post("/login", passport.authenticate("local"), function(req, res){
    res.redirect("/secrets");
    
});



// app.post("/login",(req,res)=>{

//     const user=new user_model({
//         username: req.body.username,
//         password: req.body.password
//     })

//     req.login(user,function(err){
//         if(err){
//             console.log(err)
//         }
//         else{
//             passport.authenticate("local")(req,res,function(){
//                 res.redirect("/secrets") })
//         }
//     })


app.get("/logout",(req,res)=>{
    req.logout(function(err) {
        if (err) { console.log(err) }
        res.redirect('/');
      });
})











    // const username=req.body.username
    // user_model.findOne({email:username},function(err,found_user){
    //     if(err){
    //         console.log(err);
    //     }
    //     else{
    //         if(found_user){
    //             bcrypt.compare(req.body.password, found_user.password, function(err, result) {
    //                 if(result===true){
    //                     res.render("secrets")
    //                 }
    //                 else{
    //                     console.log("try")
    //                 }
    //         })
    //     }}
        
            
           
            
        // });
        
    // });

app.post("/register",(req,res)=>{
    
    user_model.register({username:req.body.username}, req.body.password, function(err, user) {
        if (err) {
            console.log(4)
            res.redirect("/register")
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
        }
      });








    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     // Store hash in your password DB.
    //     const new_user=new user_model({
    //         email: req.body.username,
    //         password: hash
    //     })

    //     new_user.save(err=>{
    //         if(err){
    //             console.log(err)
    //         }
    //         else{
    //             res.render("secrets")
    //         }
    //     });

    // });

  

    
})

 
app.listen(3000, function() {
    console.log("Server started on port 3000.");
});
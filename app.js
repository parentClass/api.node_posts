// express import
const express = require('express')
// jwt import
const jwt = require('jsonwebtoken')
// mysql import
const mysql = require('mysql')
// body parser import
const bodyParser = require('body-parser')
// multer import
const multer = require('multer')
const upload = multer()
// md5 import
const md5 = require('md5')
// nodemailer import
const nodemailer = require('nodemailer')

// app initialization
const app = express()

// binds import to the app
app.use(bodyParser.json({limit: '20mb'}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(upload.array());

// mysql connection
const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'posts'
})

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, Authorization, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

/**
* api for signin
**/
app.post('/api/user/signin', (req, res) => {

	const email = req.body.email
	const password = md5(req.body.password)

	connection.query("SELECT id, fullname, country FROM users WHERE email = ? AND password = ?", 
						[ email, password ], function (err, rows, fields) {

		if (err) throw err

		if (Object.keys(rows).length == 1) {
			jwt.sign({
				id: rows[0].id,
				fullname: rows[0].fullname,
				country: rows[0].country,
				email: email
			}, 'secret', (err, token) => {
				res.status(202).json({
					status: 202,
					is_authenticated: true,
					token: token,
					timestamp: new Date()
				})
			})
		} else {
			res.status(401).json({
				status: 401,
				is_authenticated: false,
				message: "Given credentials are invalid.",
				timestamp: new Date()
			})
		}
	})
})

/**
* api for signup
**/
app.post('/api/user/signup', (req, res) => {

	const fullname = req.body.fullname
	const country = req.body.country
	const email = req.body.email
	const password = md5(req.body.password)

	connection.query("INSERT INTO users (fullname, country, email, password) VALUES (?, ?, ?, ?)", 
						[ fullname, country, email, password ], function (err, rows, fields) {
		if (err) throw err

		if (rows.affectedRows > 0) {
			res.status(201).json({
				status: 201,
				is_registered: true,
				message: 'User has been created.',
				timestamp: new Date()
			})
		} else {
			res.status(400).json({
				status: 400,
				is_registered: false,
				message: 'User has not been created.',
				timestamp: new Date()	
			})
		}
	})
})

/**
* POSTS API
**/

/**
* api for retreiving a post
**/
app.get('/api/post/retrieve', tokenVerify, (req, res) => {

	const id = req.query.id

	connection.query("SELECT id, title, tag, content, published_at FROM contents WHERE written_by = ?", 
						[ id ], function (err, rows, fields) {

		if (Object.keys(rows).length > 0) {

			const singlePost = []
			rows.forEach(function (row) {
				singlePost.push({
					id: row.id,
					title: row.title,
					tags: row.tag.split('!').slice(1),
					content: row.content,
					published_at: row.published_at
				})
			})
			res.status(200).json({
				status: 200,
				posts: singlePost,
				timestamp: new Date()
			})
		} else {
			res.status(204).json({
				status: 204,
				message: 'No posts found.',
				timestamp: new Date()
			})
		}					
	})
})

/**
* api for retreiving a specific post based on post id and user id
**/
app.get('/api/post/specific_retrieve', tokenVerify, (req, res) => {

	const post_id = req.query.post
	const user_id = req.query.id

	connection.query("SELECT id, title, tag, content, published_at FROM contents WHERE id = ? AND written_by = ?", 
						[ post_id, user_id ], function (err, rows, fields) {

		if (Object.keys(rows).length > 0) {

			var singlePost = []
			rows.forEach(function (row) {
				singlePost.push({
					id: row.id,
					title: row.title,
					tag: row.tag,
					content: row.content,
					published_at: row.published_at
				})
			})
			res.status(200).json({
				status: 200,
				posts: singlePost,
				timestamp: new Date()
			})
		} else {
			res.status(204).json({
				status: 204,
				message: 'No posts found.',
				timestamp: new Date()
			})
		}					
	})
})

/**
* api for publishing a post
**/
app.post('/api/post/publish', tokenVerify, (req, res) => {

	const id = req.body.id
	const tag = req.body.tag
	const title = req.body.title
	const content = req.body.content

	connection.query("INSERT INTO contents (title, tag, content, written_by) VALUES (?, ?, ?, ?)", 
						[ title, tag, content, id ], function (err, rows, fields) {

		if (err) throw err

		if (rows.affectedRows > 0) {
			res.status(201).json({
				status: 201,
				is_published: true,
				message: 'Post has been published.',
				timestamp: new Date()
			})
		} else {
			res.status(400).json({
				status: 400,
				is_published: false,
				message: 'Post has not been published.',
				timestamp: new Date()
			})
		}
	})
})

/**
* api for updating a post
**/
app.put('/api/post/update', tokenVerify, (req, res) => {

	const userid = req.body.user_id
	const postid = req.body.post_id
	const title = req.body.title
	const tag = req.body.tag
	const content = req.body.content

	connection.query("UPDATE contents SET title = ?, tag = ?, content = ? WHERE id = ? AND written_by = ?",
						[ title, tag, content, postid, userid ], function (err, rows, fields) {

		if (err) throw err

		if (rows.affectedRows > 0) {
			res.status(200).json({
				status: 200,
				is_republished: true,
				message: 'Post has been re-published.',
				timestamp: new Date()
			})
		} else {
			res.status(400).json({
				status: 400,
				is_republished: false,
				message: 'Post has not been re-published.',
				timestamp: new Date()
			})
		}					
	})
})

/**
* api for deleting a post
**/
app.delete('/api/post/delete', tokenVerify, (req, res) => {

	const postid = req.body.post_id
	const userid = req.body.user_id

	connection.query("DELETE FROM contents WHERE id = ? AND written_by = ?", 
						[ postid, userid ], function (err, rows, fields) {

		if (err) throw err

		if (rows.affectedRows > 0) {
			res.status(202).json({
				status: 202,
				is_removed: true,
				message: 'Post has been removed.',
				timestamp: new Date()
			})
		} else {
			res.status(404).json({
				status: 404,
				is_removed: false,
				message: 'Post has not been removed',
				timestamp: new Date()
			})
		}
	})
})

function tokenVerify (req, res, next) {
	const bearerHeader = req.headers['authorization']
	if (typeof bearerHeader !== 'undefined') {
		const bearer = bearerHeader.split(' ')
		const bearerToken = bearer[1]
		req.token = bearerToken
		next()
	} else {
		res.json({
			status: 403,
			message: 'Token is missing.',
			timestamp: new Date()
		})
	}
}

const port = process.env.PORT || 5000
app.listen(port, function () {
	console.log(`Server started on port ${port}....`)
})
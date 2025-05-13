import express from 'express';
import cors from 'cors';
import env from './config/environment';
import { corsOptions } from './config/cors';
import errorHandlingMiddleware from './middlewares/errorHandlingMiddleware';
import APIs_V1 from './routes/v1';
import { testConnectMail } from './services/emailService';
import cookieParser from 'cookie-parser';
import generateUniqueUsername from './utils/generateUniqueUsername';
import path from 'path';
import { app, server } from './sockets/socket';

// console.log('>>',generateUniqueUsername(['Death', 'Click']))
testConnectMail()
//cookie parser
app.use(cookieParser());

//config cors
app.use(cors(corsOptions));

//body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

//api
app.use('/v1', APIs_V1);

//error-handling middleware
app.use(errorHandlingMiddleware);

server.listen(env.PORT, () => {
    console.log(`Server listening on.PORT ${env.PORT}`);
});


/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');

const DirectChannelBot = require('./direct_channel');
const SkypeBotConfig = require('./skypebotconfig');

const REST_PORT = (process.env.PORT || 5000);

// const botConfig = new SkypeBotConfig(
//     process.env.APIAI_ACCESS_TOKEN,
//     process.env.APIAI_LANG,
//     process.env.APP_ID,
//     process.env.APP_SECRET
// );

const botConfig = new SkypeBotConfig(
    "d065f0ed17fa4fcc8a146a317d929afa",
    "en",
    "8caae466-e3f1-453d-a882-e773976d7917",
    "zbdeKUY79347])eqxIABW=#"
);

const directChannelBot = new DirectChannelBot(botConfig);

// console timestamps
require('console-stamp')(console, 'yyyy.mm.dd HH:MM:ss.l');

const app = express();
app.use(bodyParser.json());

app.post('/chat', directChannelBot.botService.listen());
app.get('/chat', function(){
     console.log('IVP Bot Test API ..... ');
});
app.listen(REST_PORT, function () {
    console.log('IVP Bot Rest service ready on port ' + REST_PORT);
    return;
});
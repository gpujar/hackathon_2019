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
const uuid = require('node-uuid');
const botbuilder = require('botbuilder');
const fs = require('fs');
// Changes to use Azure DB
//const azure = require('botbuilder-azure');

var welcomeAdaptiveCard1 = fs.readFileSync('./resources/welcome_adaptive_card.json');
const welcomeAdaptiveCard = JSON.parse(welcomeAdaptiveCard1);

var messagesHeroCard1 = fs.readFileSync('./resources/messages_hero_card.json');
var messages = JSON.parse(messagesHeroCard1);

var hindiBasicAdaptiveCard1 = fs.readFileSync('./resources/hindi/hindi_basic.json');
var hindiBasicAdaptiveCard = JSON.parse(hindiBasicAdaptiveCard1);

var hindiSmartAdaptiveCard1 = fs.readFileSync('./resources/hindi/hindi_smart.json');
var hindiSmartAdaptiveCard = JSON.parse(hindiSmartAdaptiveCard1);

var hindiFamilyKidsAdaptiveCard1 = fs.readFileSync('./resources/hindi/hindi_family_kids.json');
var hindiFamilyKidsAdaptiveCard = JSON.parse(hindiFamilyKidsAdaptiveCard1);

var hindiFamilySportsAdaptiveCard1 = fs.readFileSync('./resources/hindi/hindi_family_sports.json');
var hindiFamilySportsAdaptiveCard = JSON.parse(hindiFamilySportsAdaptiveCard1);

var relocationAdaptiveCard1 = fs.readFileSync('./resources/complaint/relocation.json');
var relocationAdaptiveCard = JSON.parse(relocationAdaptiveCard1);

var signalIssueAdaptiveCard1 = fs.readFileSync('./resources/complaint/signal_issue.json');
var signalIssueAdaptiveCard = JSON.parse(signalIssueAdaptiveCard1);

var subscribeAdaptiveCard1 = fs.readFileSync('./resources/complaint/subscribe.json');
var subscribeAdaptiveCard = JSON.parse(subscribeAdaptiveCard1);

module.exports = class SkypeBot {

    get apiaiService() {
        return this._apiaiService;
    }

    set apiaiService(value) {
        this._apiaiService = value;
    }

    get botConfig() {
        return this._botConfig;
    }

    set botConfig(value) {
        this._botConfig = value;
    }

    get botService() {
        return this._botService;
    }

    set botService(value) {
        this._botService = value;
    }

    get sessionIds() {
        return this._sessionIds;
    }

    set sessionIds(value) {
        this._sessionIds = value;
    }

    constructor(botConfig) {
        this._botConfig = botConfig;
        var apiaiOptions = {
            language: botConfig.apiaiLang,
            requestSource: "skype"
        };

        this._apiaiService = apiai(botConfig.apiaiAccessToken, apiaiOptions);
        this._sessionIds = new Map();

        this.botService = new botbuilder.ChatConnector({
            appId: this.botConfig.skypeAppId,
            appPassword: this.botConfig.skypeAppSecret
        });

        var inMemoryStorage = new botbuilder.MemoryBotStorage();
        this._bot = new botbuilder.UniversalBot(this.botService).set('storage', inMemoryStorage); // Register in memory storage

       // this._bot = new botbuilder.UniversalBot(this.botService).set('storage', cosmosStorage); //Working with Azure DB

        this._bot.dialog('/', (session) => {
            console.log('dialog dialog dialog.... ');
            if (session.message && session.message.text) {
                console.log("CTAP Guru :: address ",session.message.address);
                //Changes to use Azure DB
                // let savedAddress = session.message.address;
                // session.userData.savedAddress = savedAddress;
               // this.sendProactiveMessage(session.userData.savedAddress);
                this.processMessage(session);
            }
        });

        /**
         * Display welcome message on launch of direct channel page.
         *
         */
        this._bot.on('event', (session) => {
            console.log('IVP Bot  ............  event session format  '+JSON.stringify(session));
            if(session.name === "ConversationUpdate"){
                    let responseText = "welcome";
                    let responseMessages = [{"type":0,"speech":"welcome"}];
                    let intentAction = "welcome";
                    let intentParameters = {};
                    this.sendProactiveMessage(session.address);
            }
        });
    }

    sendProactiveMessage(address) {
        var msg = new botbuilder.Message().address(address);
        msg.text('Welcome to IVP Help Desk');
        //msg.textLocale('en-US');
        this._bot.send(msg);
    }

    processMessage(session) {
        let messageText = session.message.text;
        let sender = session.message.address.conversation.id;
        if (messageText && sender) {
            console.log(sender, messageText);
            if (!this._sessionIds.has(sender)) {
                this._sessionIds.set(sender, uuid.v1());
            }
            let apiaiRequest = this._apiaiService.textRequest(messageText,
                {
                    sessionId: this._sessionIds.get(sender),
                    originalRequest: {
                        data: session.message,
                        source: "skype"
                    }
                });
            apiaiRequest.on('response', (response) => {
                console.log('IVP Bot :: Api.ai response  ', JSON.stringify(response));
                if (this._botConfig.devConfig) {
                    console.log(sender, "Received api.ai response");
                }
                if (SkypeBot.isDefined(response.result) && SkypeBot.isDefined(response.result.fulfillment)) {
                    let responseText = response.result.fulfillment.speech;
                    let responseMessages = response.result.fulfillment.messages;
                    let intentAction = response.result.action;
                    let intentParameters = response.result.parameters;

                    console.log('IVP Bot :: intentAction '+intentAction);
                    console.log('IVP Bot :: intentParameters '+JSON.stringify(intentParameters));
                    console.log('IVP Bot :: responseText '+responseText);
                    console.log('IVP Bot :: responseMessages '+JSON.stringify(responseMessages));

                    if (SkypeBot.isDefined(responseMessages) && responseMessages.length > 0) {
                        this.getMessage(session, responseMessages, intentAction, intentParameters);
                    } else if (SkypeBot.isDefined(responseText)) {
                        console.log(sender, 'Response as text message');
                        session.send(responseText);
                    } else {
                        console.log(sender, 'Received empty speech');
                    }
                } else {
                    console.log(sender, 'Received empty result');
                }
            });
            apiaiRequest.on('error', (error) => {
                console.error(sender, 'Error while call to api.ai', error);
            });
            apiaiRequest.end();
        } else {
            console.log('Empty message');
        }
    }

    getMessage(session, message, intentAction, intentParameters) {
        let steps_message;
        let validation_message;
        switch (intentAction) {
            case "welcome":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.WELCOME.steps.title, messages.setup.WELCOME.steps.subtitle, messages.setup.WELCOME.steps.imageUrl, messages.setup.WELCOME.steps.buttons);
                session.send(validation_message);
               // session.send(this.sendAdaptiveCard(session,welcomeAdaptiveCard));
            }
                break;
            case "faq":{
               // validation_message = this.getHeroCardResponseText(session, messages.setup.SETUP.title, messages.setup.SETUP.subtitle, messages.setup.SETUP.imageUrl, messages.setup.SETUP.buttons);
               // session.send(validation_message);
            }
                break;
            case "manual":{
               // validation_message = this.getHeroCardResponseText(session, messages.setup.DEVELOPMENT.title, messages.setup.DEVELOPMENT.subtitle, messages.setup.DEVELOPMENT.imageUrl, messages.setup.DEVELOPMENT.buttons);
               // session.send(validation_message);
            }
                break;
            case "packages":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.title, messages.setup.PACKAGES.subtitle, messages.setup.PACKAGES.imageUrl, messages.setup.PACKAGES.buttons);
                session.send(validation_message);
            }
                break;
            case "package_hindi":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_hindi.title, messages.setup.PACKAGES.package_hindi.subtitle, messages.setup.PACKAGES.package_hindi.imageUrl, messages.setup.PACKAGES.package_hindi.buttons);
                session.send(validation_message);
            }
                break;
            case "package_english":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_english.title, messages.setup.PACKAGES.package_english.subtitle, messages.setup.PACKAGES.package_english.imageUrl, messages.setup.PACKAGES.package_english.buttons);
                session.send(validation_message);
            }
                break;
            case "package_tamil":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_tamil.title, messages.setup.PACKAGES.package_tamil.subtitle, messages.setup.PACKAGES.package_tamil.imageUrl, messages.setup.PACKAGES.package_tamil.buttons);
                session.send(validation_message);
            }
                break;
            case "package_telugu":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_telugu.title, messages.setup.PACKAGES.package_telugu.subtitle, messages.setup.PACKAGES.package_telugu.imageUrl, messages.setup.PACKAGES.package_telugu.buttons);
                session.send(validation_message);
            }
                break;
            case "hindi_basic":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_hindi.hindi_basic.title, messages.setup.PACKAGES.package_hindi.hindi_basic.subtitle, messages.setup.PACKAGES.package_hindi.hindi_basic.imageUrl, messages.setup.PACKAGES.package_hindi.hindi_basic.buttons);
                session.send(validation_message);
            }
                break;
            case "hindi_smart":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_hindi.hindi_smart.title, messages.setup.PACKAGES.package_hindi.hindi_smart.subtitle, messages.setup.PACKAGES.package_hindi.hindi_smart.imageUrl, messages.setup.PACKAGES.package_hindi.hindi_smart.buttons);
                session.send(validation_message);
            }
                break;
            case "hindi_family_kids":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_hindi.hindi_family_kids.title, messages.setup.PACKAGES.package_hindi.hindi_family_kids.subtitle, messages.setup.PACKAGES.package_hindi.hindi_family_kids.imageUrl, messages.setup.PACKAGES.package_hindi.hindi_family_kids.buttons);
                session.send(validation_message);
            }
                break;
            case "hindi_family_sports":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_hindi.hindi_family_sports.title, messages.setup.PACKAGES.package_hindi.hindi_family_sports.subtitle, messages.setup.PACKAGES.package_hindi.hindi_family_sports.imageUrl, messages.setup.PACKAGES.package_hindi.hindi_family_sports.buttons);
                session.send(validation_message);
            }
                break;
            case "english_basic":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_english.english_basic.title, messages.setup.PACKAGES.package_english.english_basic.subtitle, messages.setup.PACKAGES.package_english.english_basic.imageUrl, messages.setup.PACKAGES.package_english.english_basic.buttons);
                session.send(validation_message);
            }
                break;
            case "english_smart":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_english.english_smart.title, messages.setup.PACKAGES.package_english.english_smart.subtitle, messages.setup.PACKAGES.package_english.english_smart.imageUrl, messages.setup.PACKAGES.package_english.english_smart.buttons);
                session.send(validation_message);
            }
                break;
            case "english_family_kids":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_english.english_family_kids.title, messages.setup.PACKAGES.package_english.english_family_kids.subtitle, messages.setup.PACKAGES.package_english.english_family_kids.imageUrl, messages.setup.PACKAGES.package_english.english_family_kids.buttons);
                session.send(validation_message);
            }
                break;
            case "english_family_sports":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_english.english_family_sports.title, messages.setup.PACKAGES.package_english.english_family_sports.subtitle, messages.setup.PACKAGES.package_english.english_family_sports.imageUrl, messages.setup.PACKAGES.package_english.english_family_sports.buttons);
                session.send(validation_message);
            }
                break;
             case "tamil_basic":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_tamil.tamil_basic.title, messages.setup.PACKAGES.package_tamil.tamil_basic.subtitle, messages.setup.PACKAGES.package_tamil.tamil_basic.imageUrl, messages.setup.PACKAGES.package_tamil.tamil_basic.buttons);
                session.send(validation_message);
            }
                break;
            case "tamil_smart":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_tamil.tamil_smart.title, messages.setup.PACKAGES.package_tamil.tamil_smart.subtitle, messages.setup.PACKAGES.package_tamil.tamil_smart.imageUrl, messages.setup.PACKAGES.package_tamil.tamil_smart.buttons);
                session.send(validation_message);
            }
                break;
            case "tamil_family_kids":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_tamil.tamil_family_kids.title, messages.setup.PACKAGES.package_tamil.tamil_family_kids.subtitle, messages.setup.PACKAGES.package_tamil.tamil_family_kids.imageUrl, messages.setup.PACKAGES.package_tamil.tamil_family_kids.buttons);
                session.send(validation_message);
            }
                break;
            case "tamil_family_sports":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_tamil.tamil_family_sports.title, messages.setup.PACKAGES.package_tamil.tamil_family_sports.subtitle, messages.setup.PACKAGES.package_tamil.tamil_family_sports.imageUrl, messages.setup.PACKAGES.package_tamil.tamil_family_sports.buttons);
                session.send(validation_message);
            }
                break;
            case "telugu_basic":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_telugu.telugu_basic.title, messages.setup.PACKAGES.package_telugu.telugu_basic.subtitle, messages.setup.PACKAGES.package_telugu.telugu_basic.imageUrl, messages.setup.PACKAGES.package_telugu.telugu_basic.buttons);
                session.send(validation_message);
            }
                break;
            case "telugu_smart":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_telugu.telugu_smart.title, messages.setup.PACKAGES.package_telugu.telugu_smart.subtitle, messages.setup.PACKAGES.package_telugu.telugu_smart.imageUrl, messages.setup.PACKAGES.package_telugu.telugu_smart.buttons);
                session.send(validation_message);
            }
                break;
            case "telugu_family_kids":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_telugu.telugu_family_kids.title, messages.setup.PACKAGES.package_telugu.telugu_family_kids.subtitle, messages.setup.PACKAGES.package_telugu.telugu_family_kids.imageUrl, messages.setup.PACKAGES.package_telugu.telugu_family_kids.buttons);
                session.send(validation_message);
            }
                break;
            case "telugu_family_sports":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.PACKAGES.package_telugu.telugu_family_sports.title, messages.setup.PACKAGES.package_telugu.telugu_family_sports.subtitle, messages.setup.PACKAGES.package_telugu.telugu_family_sports.imageUrl, messages.setup.PACKAGES.package_telugu.telugu_family_sports.buttons);
                session.send(validation_message);
            }
                break;
            case "complaint":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.REQUEST.title, messages.setup.REQUEST.subtitle, messages.setup.REQUEST.imageUrl, messages.setup.REQUEST.buttons);
                session.send(validation_message);
            }
                break;
            case "signal_issue":{
                session.send(this.sendAdaptiveCard(session,signalIssueAdaptiveCard));
                validation_message = this.getHeroCardResponseText(session, messages.setup.SUBSCRIBE.title, messages.setup.SUBSCRIBE.subtitle, messages.setup.SUBSCRIBE.imageUrl, messages.setup.SUBSCRIBE.buttons);
                session.send(validation_message);
            }
                break;
            case "relocation":{
                session.send(this.sendAdaptiveCard(session,relocationAdaptiveCard));
                validation_message = this.getHeroCardResponseText(session, messages.setup.SUBSCRIBE.title, messages.setup.SUBSCRIBE.subtitle, messages.setup.SUBSCRIBE.imageUrl, messages.setup.SUBSCRIBE.buttons);
                session.send(validation_message);
            }
                break;
            case "subscribe":{
                session.send(this.sendAdaptiveCard(session,subscribeAdaptiveCard));
                validation_message = this.getHeroCardResponseText(session, messages.setup.SUBSCRIBE.title, messages.setup.SUBSCRIBE.subtitle, messages.setup.SUBSCRIBE.imageUrl, messages.setup.SUBSCRIBE.buttons);
                session.send(validation_message);
            }
                break;
            case "close":{
                validation_message = this.getHeroCardResponseText(session, messages.setup.CLOSE.steps.title, messages.setup.CLOSE.steps.subtitle, messages.setup.CLOSE.steps.imageUrl, messages.setup.CLOSE.steps.buttons);
                session.send(validation_message);
               // session.endConversationAction();
            }
                break;
            default:
            {
                for (let messageIndex = 0; messageIndex < message.length; messageIndex++) {
                    let msg = message[messageIndex];
                    switch (msg.type) {
                        //message.type 0 means text message
                        case 0:
                        {
                            if (SkypeBot.isDefined(msg.speech)) {
                                session.send(msg.speech);
                            }
                        }
                            break;
                    }
                }
            }
        }
    }

    getHeroCardResponseText(session, title, subtitle, imageUrl, buttons) {
        let heroCard = new botbuilder.HeroCard(session).title(title);
        if (SkypeBot.isDefined(subtitle)) {
            heroCard = heroCard.subtitle(subtitle)
        }
        console.log('CTAP Guru :: getHeroCardResponseText imageUrl ' + imageUrl);
        if (SkypeBot.isDefined(imageUrl)) {
            heroCard = heroCard.images([botbuilder.CardImage.create(session, imageUrl)]);
        }
        if (SkypeBot.isDefined(buttons)) {
            let buttons_ = [];
            for (let buttonIndex = 0; buttonIndex < buttons.length; buttonIndex++) {
                let messageButton = buttons[buttonIndex];
                if (messageButton.text) {
                    let postback = messageButton.postback;
                    if (!postback) {
                        postback = messageButton.text;
                    }
                    let button;
                    if (postback.startsWith("http")) {
                        button = botbuilder.CardAction.openUrl(session, postback, messageButton.text);
                    } else {
                       // button = botbuilder.CardAction.postBack(session, postback, messageButton.text); //Skype Code
                        button = botbuilder.CardAction.imBack(session, postback, messageButton.text);
                       // button = botbuilder.CardAction.messageBack(session).title(messageButton.text).displayText(messageButton.text).value("Value").text(postback);
                    }
                    buttons_.push(button);
                }
            }
            heroCard.buttons(buttons_);
        }
        return new botbuilder.Message(session).attachments([heroCard]);
    }

    sendAdaptiveCard(session, card){
        return new botbuilder.Message(session).addAttachment(card);
    }

    doRichContentResponse(session, messages) {

        for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
            let message = messages[messageIndex];
            switch (message.type) {
                //message.type 0 means text message
                case 0:
                {
                    if (SkypeBot.isDefined(message.speech)) {
                        session.send(message.speech);
                    }
                }
                    break;
                //message.type 1 means card message
                case 1:
                {
                    let heroCard = new botbuilder.HeroCard(session).title(message.title);

                    if (SkypeBot.isDefined(message.subtitle)) {
                        heroCard = heroCard.subtitle(message.subtitle)
                    }

                    if (SkypeBot.isDefined(message.imageUrl)) {
                        heroCard = heroCard.images([botbuilder.CardImage.create(session, message.imageUrl)]);
                    }

                    if (SkypeBot.isDefined(message.buttons)) {
                        let buttons = [];
                        for (let buttonIndex = 0; buttonIndex < message.buttons.length; buttonIndex++) {
                            let messageButton = message.buttons[buttonIndex];
                            if (messageButton.text) {
                                let postback = messageButton.postback;
                                if (!postback) {
                                    postback = messageButton.text;
                                }
                                let button;
                                if (postback.startsWith("http")) {
                                    button = botbuilder.CardAction.openUrl(session, postback, messageButton.text);
                                } else {
                                    button = botbuilder.CardAction.postBack(session, postback, messageButton.text);
                                }
                                buttons.push(button);
                            }
                        }
                        heroCard.buttons(buttons);
                    }

                    let msg = new botbuilder.Message(session).attachments([heroCard]);
                    session.send(msg);
                }
                    break;

                //message.type 2 means quick replies message
                case 2:
                {
                    let replies = [];
                    let heroCard = new botbuilder.HeroCard(session).title(message.title);
                    if (SkypeBot.isDefined(message.replies)) {
                        for (let replyIndex = 0; replyIndex < message.replies.length; replyIndex++) {
                            let messageReply = message.replies[replyIndex];
                            let reply = botbuilder.CardAction.postBack(session, messageReply, messageReply);
                            replies.push(reply);
                        }
                        heroCard.buttons(replies);
                    }
                    let msg = new botbuilder.Message(session).attachments([heroCard]);
                    session.send(msg);
                }
                    break;
                //message.type 3 means image message
                case 3:
                {
                    let heroCard = new botbuilder.HeroCard(session).images([botbuilder.CardImage.create(session, message.imageUrl)]);
                    let msg = new botbuilder.Message(session).attachments([heroCard]);
                    session.send(msg);
                }
                    break;
                default:
                    break;
            }
        }

    }

    static isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }
        if (!obj) {
            return false;
        }
        return obj != null;
    }
}
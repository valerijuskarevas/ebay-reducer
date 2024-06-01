import axios from 'axios'
import fs from 'fs'
import path from 'path'
import xml2json from 'xml-js'
import { readFileSync } from 'fs'
import EbayAuthToken from 'ebay-oauth-nodejs-client'
import Items from './Items.js'
const fileName = path.resolve('./config.json')

const scopes = 'https://api.ebay.com/oauth/api_scope/sell.inventory'

export default class Auth {

    getConfigFile() {
        const defaultConfig = path.resolve('./config.example.json')
        if (!fs.existsSync(fileName)) {
            const configData = fs.readFileSync(defaultConfig).toString()
            fs.writeFileSync(fileName, configData, { recursive: true })
        }
        const confFile = JSON.parse(fs.readFileSync(fileName))
        return { fileName, confFile }
    }

    async callEbayApi(method, xmlbody) {
        const confFile = JSON.parse(readFileSync(fileName))
        const token = await this.getToken()
        const headers = {
            "X-EBAY-API-SITEID": 0,
            "X-EBAY-API-COMPATIBILITY-LEVEL": 967,
            "X-EBAY-API-CALL-NAME": method,
            "X-EBAY-API-IAF-TOKEN": `${token}`,
            'Content-Type': 'text/xml'
        };
        return await new Promise(function (resolve) {
            axios.post(confFile.url, xmlbody, { headers }).catch(function (e) {
                const data = e.response.data
                resolve(JSON.parse(xml2json.xml2json(data, { compact: true })));
            }).then(function (response) {
                resolve(JSON.parse(xml2json.xml2json(response.data, { compact: true })));
            })
        })
    }

    initEbayToken() {
        const confFile = JSON.parse(readFileSync(fileName))
        if (!confFile.auth || !confFile.auth.clientId
            || !confFile.auth.clientSecret || !confFile.auth.redirectUri) {
            throw new Error("Configuration file not set!".replaceAll(' ', '^ '))
        }
        return new EbayAuthToken({
            clientId: confFile.auth.clientId,
            clientSecret: confFile.auth.clientSecret,
            redirectUri: confFile.auth.redirectUri,
        });
    }

    async isAuthorized() {
        const confFile = JSON.parse(readFileSync(fileName))
        if (!confFile.auth || !confFile.auth.clientId || !confFile.auth.clientSecret
            || !confFile.auth.redirectUri || !confFile.auth.refreshToken) {
            throw new Error("Configuration file not set!".replaceAll(' ', '^ '))
        }

        const itemCtrl = new Items()
        const content = await itemCtrl.getAllItems(1);

        if (content && content['Errors']) {
            const resp = content['Errors']['LongMessage']._text
            return `${resp.replaceAll(' ', '^ ')}`
        }
        return 'ONLINE'
    }

    getAuthorizationCodeUrl() {
        const ebayAuthToken = this.initEbayToken()
        return ebayAuthToken.generateUserAuthorizationUrl('PRODUCTION', scopes);
    }

    async exchangeCodeForAccessToken() {
        const confFile = JSON.parse(readFileSync(fileName))
        const ebayAuthToken = this.initEbayToken()
        return await ebayAuthToken.exchangeCodeForAccessToken('PRODUCTION', confFile.auth.authorizationGrandCode);
    }

    async getRefreshToken(authorizationGrandCode) {
        const ebayAuthToken = this.initEbayToken()
        const tokenJson = await ebayAuthToken.exchangeCodeForAccessToken('PRODUCTION', authorizationGrandCode);
        if (tokenJson.error) {
            throw new Error(JSON.parse(tokenJson).error_description)
        } 
        return JSON.parse(tokenJson).refresh_token
    }

    async getToken() {
        const confFile = JSON.parse(readFileSync(fileName))
        const ebayAuthToken = this.initEbayToken()
        const tokenData = await ebayAuthToken.getAccessToken('PRODUCTION', confFile.auth.refreshToken, scopes);
        return JSON.parse(tokenData).access_token
    }
}

import fs from 'fs';
const path = './logs'

export default class Reporter {
    logError(errorMessage) {
        const fileName = `${path}/errorLog.txt`

        if (!fs.existsSync(fileName)) {
            fs.mkdirSync(path, { recursive: true });
            fs.writeFileSync(fileName, '', { recursive: true })
        }

        const time = new Date().toLocaleString('sv', { timeZoneName: 'short' });
        const error = `---------------------------------------
        ${time}
        ${errorMessage}
        `

        const oldData = fs.readFileSync(fileName).toString()
        const newData = error.replaceAll('        ', '') + oldData
        fs.writeFileSync(fileName, newData)
    }

    reductionReset() {
        const fileName = `${path}/reductionLog.txt`
        if (!fs.existsSync(fileName)) {
            fs.mkdirSync(path, { recursive: true });
            fs.writeFileSync(fileName, '', { recursive: true })
        }
        fs.writeFileSync(fileName, '')
    }
    reductionLog() {
        const fileNameJson = `reductionLog.json`
        const fileName = `${path}/reductionLog.txt`

        const items = JSON.parse(fs.readFileSync(fileNameJson).toString())
        let responseData = ''
        for (const item of items) {
            responseData += `---------------------------------------
            ${item.reductionDateTime}
            ${item.itemId}-${item.title}
            Reduced from ${item.originalPrice} to ${item.newPrice}
            `
        }
        fs.writeFileSync(fileName, responseData.replaceAll('        ', ''))
    }
    reductionJson(item) {
        const fileName = `reductionLog.json`
        const data = JSON.parse(fs.readFileSync(fileName).toString())

        const newData = data.filter((i) => i.itemId != item.itemId)
        newData.push(item)

        fs.writeFileSync(fileName, JSON.stringify(newData))
    }
}

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
    reductionLog(item) {
        const fileName = `${path}/reductionLog.txt`
        const time = new Date().toLocaleString('sv', { timeZoneName: 'short' });
        const data = `---------------------------------------
        ${time}
        ${item.itemId}-${item.title}
        Reduced from ${item.originalPrice} to ${item.newPrice}
        `
        const oldData = fs.readFileSync(fileName).toString()
        const newData = data.replaceAll('        ', '') + oldData
        fs.writeFileSync(fileName, newData)
    }
}

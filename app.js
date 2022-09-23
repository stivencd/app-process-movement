require('dotenv').config()
const { Kafka } = require('kafkajs')
const MongoClient = require('mongodb').MongoClient
const appPromise = require('./middlewares/configprovider').appPromise;
const logProvider = require('./middlewares/logprovider');

appPromise.then(function(){
    const kafka = new Kafka({
        clientId: 'transaction-client',
        brokers: [process.env.KAFKA_SERVER],
    })
     
     
    kafka_consumer()
     
    async function kafka_consumer() {
        logProvider.info('Start KafkaConsumer in ProcessMovement.js')

        const consumer = kafka.consumer({ groupId: 'movement-subscription', allowAutoTopicCreation: true })
        await consumer.connect()
        await consumer.subscribe({ topic: 'transaction-topic', fromBeginning: true })
        await consumer.run({
            autoCommit: false,
            eachMessage: async ({ topic, partition, message }) => {
                console.log({ value: message.value.toString() })
                const val = JSON.parse(message.value.toString());
                MongoClient.connect(process.env.DB_MONGO_URI, function (err, db) {
                    if (err) throw err
                    var query = { accountid: val.accountId, type: val.type, amount: val.amount, creationDate: val.creationDate };
                    db.db(process.env.DB_MONGO_DATABASE_MOVEMENT).collection("movement").insertOne(query, function(err, res) {
                        console.log(err); console.log(res);
                        if (err) throw err
                        db.close()
                    })
                })               
               
            },
        })
    }
})

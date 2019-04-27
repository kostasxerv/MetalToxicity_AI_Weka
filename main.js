const fs = require('fs'); 
const csv = require('csv-parser');



function loadDataSet(){
	let dataSet = []
	return new Promise(resolve => {
		fs.createReadStream('./data.csv')
			.pipe(csv())
			.on('data', function(data){
			    try {
			    	let o = {}
			    	Object.keys(data).forEach( k => {
			    		o = Object.assign(o, {[k]: data[k]})
			    	});
			    	dataSet.push(o)
			    }
			    catch(err) {
			        console.log('error', err)
			    }
			})
			.on('end', () => resolve(dataSet));  
	})
}

function normalizeData(data){
	const max = Math.max(...data)
	const min = Math.min(...data)

	return data.map(val => (val - min) / (max - min))
}

	/**
 * calculates pearson correlation
 * @param {number[]} d1
 * @param {number[]} d2
 */

function getPearsonCoorelation(d1, d2){
	let { min, pow, sqrt } = Math
	let add = (a, b) => a + b
	let n = min(d1.length, d2.length)
	if (n === 0) {
		return 0
	}
	[d1, d2] = [d1.slice(0, n), d2.slice(0, n)]
	let [sum1, sum2] = [d1, d2].map(l => l.reduce(add))
	let [pow1, pow2] = [d1, d2].map(l => l.reduce((a, b) => a + pow(b, 2), 0))
	let mulSum = d1.map((n, i) => n * d2[i]).reduce(add)
	let dense = sqrt((pow1 - pow(sum1, 2) / n) * (pow2 - pow(sum2, 2) / n))
	if (dense === 0) {
		return 0
	}
	return (mulSum - (sum1 * sum2 / n)) / dense
}

function chooseTwoVariables(data){
	let relations = []
	for (let i = 0; i < data.length; i++){
		for (let j = i + 1; j < data.length - 1; j++){
			relations.push({key1: data[i].key, key2: data[j].key, value: getPearsonCoorelation(data[i].data, data[j].data)})
		}
	}
	const max = Math.max(...relations.map(d => d.value))
	const choosen = relations.find(r => r.value == max)
	console.log(choosen)
	return choosen
	// find the two max vars using pearson
}

function separateData(data){
	let d1 = [], d2 = []
	const distance = (a,b) => Math.abs(a-b)	
	let mean = data.reduce((a,b) => a + b) / data.length
	const distances = data.map(d => distance(d, mean))
	const min =  Math.min(...distances)
	let s1 = data[distances.indexOf(min)]
	d1.push(s1)

	for(let i = 1; i < 10; i++){
		let min = null
		let index = null
		for(let j = 1; j < data.length; j++){
			if(d1.includes(data[j])) continue;
			
			const dis = d1.map(d => distance(data[j], d)).reduce((a,b) => a + b) / d1.length

			if(min) {
				if(min > dis) {
					min = dis
					index = j
				}
			} else {
				min = dis
				index = j
			}
		}
		d1.push(data[index])
	}

	d2 = data.filter(d => !d1.includes(d))

	return {d1, d2}
}

async function main(){
	// load data from file
	const dataSet = await loadDataSet()

	// get the labels 
	const labels = Object.keys(dataSet[0]).map(k => k)
	
	// normalize data
	let normalizedDataSet = []
	labels.slice(1, labels.length - 1) // get all except the last which is the toxicity index
		.forEach(k => {
			const data = dataSet.map(d => d[k])
			normalizedDataSet.push({key: k, data: normalizeData(data)})
		})

	// get the choosen vars with pearson coorelation	
	const choosenVars = chooseTwoVariables(normalizedDataSet)

	const index1 = labels.indexOf(choosenVars.key1)
	const index2 = labels.indexOf(choosenVars.key2)

	// divide into 2 arrays (training - evaluation)
	const selectedData = normalizedDataSet[index1].data
	const {d1, d2} = separateData(selectedData.slice(0, selectedData.length - 1))
	
	// export to files
	const header = [
	  	{ id: 'var1', title: normalizedDataSet[index1].key },
	  	{ id: 'var2', title: normalizedDataSet[index2].key },
	  	{ id: 'toxicity', title: 'Toxicity Index' },
	  ] // headers for the files

	const trainingRecords = d1.map((v, i) => {
		const index = normalizedDataSet[index1].data.indexOf(v)
		return { 
			var1: v.toString(),
			var2: normalizedDataSet[index2].data[index].toString(),
			toxicity: dataSet[index]['Toxicity Index']
		} // records of the training data
	})

	const evaluationRecords = d2.map((v, i) => {
		const index = normalizedDataSet[index1].data.indexOf(v)
		return { 
			var1: v.toString(),
			var2: normalizedDataSet[index2].data[index].toString(),
			toxicity: dataSet[index]['Toxicity Index']
		} // records of the evaluation data
	})

	const predictionData = [{ 
			var1: normalizedDataSet[index1].data[17].toString(),
			var2: normalizedDataSet[index2].data[17].toString(),
			toxicity: ''
	}] // records of the data to predict
	

	exportToCsv('training-data', header, trainingRecords)
	exportToCsv('evaluation-data', header, evaluationRecords)
	exportToCsv('predict-data', header, predictionData) 
}


function exportToCsv(file, header, records){
	const createCsvWriter = require('csv-writer').createObjectCsvWriter;  
	const csvWriter = createCsvWriter({  
	  path: file + '.csv',
	  header
	});

	return csvWriter  
	  .writeRecords(records)
	  .then(()=> console.log('The CSV file was written successfully'));
}




main()
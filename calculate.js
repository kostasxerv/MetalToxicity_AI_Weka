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
	const maxRelation = relations.find(r => r.value == max)
	console.log(maxRelation)
	// find the two max vars using pearson
}

async function main(){
	const dataSet = await loadDataSet()

	const labels = Object.keys(dataSet[0]).map(k => k)
	
	let normalizedDataSet = []
	labels
		// .slice(1,3)
		.slice(1, labels.length -1)
		.forEach(k => {
			const data = dataSet.map(d => d[k])
			normalizedDataSet.push({key: k, data: normalizeData(data)})
		})

	chooseTwoVariables(normalizedDataSet)
}

main()
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

async function main(){
	const dataSet = await loadDataSet()

	const labels = Object.keys(dataSet[0]).map(k => k)
	
	let normalizedDataSet = []
	labels
		.slice(1, labels.length -1)
		.forEach(k => {
			const data = dataSet.map(d => d[k])
			normalizedDataSet.push({key: k, data: normalizeData(data)})
		})

	const choosenVars = chooseTwoVariables(normalizedDataSet)

	const index1 = labels.indexOf(choosenVars.key1)
	console.log(index1)
	const index2 = labels.indexOf(choosenVars.key2)
	console.log(index2)

	// console.log(dataSet.map(d => d[labels[0]]), normalizedDataSet[index1], normalizedDataSet[index2])

	const {d1, d2} = separateData(normalizedDataSet[index1].data)
	let D = normalizedDataSet[index1].data
	console.log(d1.map(d => dataSet[D.indexOf(d)]['Metal Oxide']))


	console.log(d2.map(d => dataSet[D.indexOf(d)]['Metal Oxide']))
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

main()
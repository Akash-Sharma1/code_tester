const fs = require("fs");
const vscode = require('vscode');
const path = require("path");
const {c, cpp, node, python, java} = require('compile-run');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "code-tester" is now active!');
	vscode.window.showInformationMessage('Started!');

	let disposable = vscode.commands.registerCommand('code-tester.creategenerater', ()=>{ makegeneratorfile() } );
	function makegeneratorfile() {	
		var File_Path = vscode.window.activeTextEditor.document.fileName;
		var File_Name = path.basename(File_Path);
		var Dir_path = File_Path;
		for(var i= Dir_path.length-1;i>=0;i--){if(Dir_path[i] == '\\'){Dir_path = Dir_path.substring(0,i+1);break;}}		
		var Generatorfile_path = Dir_path+'generator.cpp';

		function readData(err, data) {			
			var Data = data;
			Data = Data.split('\r').join('')
			Data = add_random_variables(Data);
			Data = addsrand_to_start(Data);
			
			if(Data == "error"){
				vscode.window.showInformationMessage('Plese follow the specified format give in Readme!');
			}
			else{
				writegeneratorfile(Data);
			}
	  	}

		function writegeneratorfile(data){
			fs.writeFile(Generatorfile_path, data, (err,data)=>{
				if(err)console.error(err);
				else 
				vscode.window.showInformationMessage('Generator file created!');
			});
		}
		  
		function addsrand_to_start(Data){
			var i = Data.indexOf("main");
			while(i < Data.length && Data[i] != '{'){i++;}
			if(Data[i] == '{'){
				i++;
				Data = Data.substring(0,i)+"\n\tsrand(time(0));\n\tfreopen (\"testfile.txt\",\"w\",stdout);\n"+Data.substring(i+1,Data.length);
			}
			return Data;
		}

		function add_random_variables(Data){
			var n = Data.length;
			var linenum = 1;
			var tabs = 0;
			var open_brackets = ['(','{','['];
			var close_brackets = [')','}',']'];

			for(var i=0;i<n;i++){
				//avoiding comments
				if(Data[i] == '\n'){linenum++;tabs=0;continue;}
				else if(Data[i] == '\t'){tabs++;continue;}
				if(i+1 < n && Data.substring(i,i+2)=="//" ){
					while(i<n && Data[i] != '\n'){i++;}
				}	
				else if(i+1 < n && Data.substring(i,i+2)=="/*"){
					while(i+1 < n && Data.substring(i,i+2)=="*/"){i++;
						if(Data[i] == '\t'){tabs++;}if(Data[i] == '\n'){linenum++;tabs=0;}
					}i++;
				}
				else if(i+2 < n && Data.substring(i,i+5) == "cin>>"){
					var j = i + 3;
					var variable = [];
					var temp = "";
					var brackets = 0;
					for(var j=i+5;j<n;j++){
						if(Data[j] == ';'){
							Data = Data.substring(0,i)+'//'+Data.substring(i,j+1)+Data.substring(j+1,n);
							variable.push(temp);
							n = Data.length;
							i = j + 5;
							break;
						}
						else if(Data[j] == '>' && brackets == 0){

							variable.push(temp);
							temp = "";
							j++;
						}
						else{
							for(var k=0;k<open_brackets.length;k++){if(Data[j] == open_brackets[k]){brackets++;}}
							for(var k=0;k<close_brackets.length;k++){if(Data[j] == close_brackets[k]){brackets--;}}
							temp += Data[j];
						}
					}
					var interval_string = "";
					var last = n;
					for(var j=i;j<n;j++){
						if(Data[j] == '\n'){last=j;break;}
						interval_string += Data[j];
					}
					var interval_arr = interval_string.split(' ');
					var Interval = [];
					for(var j=0;j<interval_arr.length;j++){
						if(interval_arr[j].length <= 1)continue;
						Interval.push( interval_arr[j].split('-') );
						if(Interval[j].length != 2){
							console.error("Interval of variable are not properly specified on linenum:"+linenum);
							return "error";
						}
					}
					if(Interval.length != variable.length){
						console.error("Interval count doesn't match input variable count on linenum:"+linenum);
						return "error";
					}
					var final_string = "";
					var tabspace="";
					if(tabs<1)tabs=1;
					for(var t=0;t<tabs;t++){tabspace+='\t';}
					for(var j=0;j<variable.length;j++){
						final_string += tabspace + variable[j] + ' = rand()%' + Interval[j][1] + '+' + Interval[j][0]+';';
						final_string += " cout<<"+variable[j]+"<<\" \";\n";   
						linenum++;
					}
					final_string += tabspace + "cout<<\" --input \"<<endl;\n\n";
					linenum++;
					tabs = 0;
					Data = Data.substring(0,i-2)+'\n'+ final_string + Data.substring(last+1,n);
					n = Data.length;
				}
			}
			return Data;
		}

		
		fs.readFile(File_Path, 'utf8', readData);
	}
	
	function seperateinop(File_Path) {
		var Dir_path = File_Path;
		for(var i= Dir_path.length-1;i>=0;i--){
			if(Dir_path[i] == '\\'){
				Dir_path = Dir_path.substring(0,i+1);
				break;
			}
		}
		var inputfile_path = Dir_path+'in.txt';
		var outputfile_path = Dir_path+'out.txt';
		
		function readData(err, data) {
			var Data = data;
			Data = Data.split('\r').join('')
			var X = seperate(Data);			
			writegeneratorfile(X);

	  	}
		fs.readFile(File_Path, 'utf8', readData);

		function writegeneratorfile(X){
			var flag = 1;
			fs.writeFile(inputfile_path, X[0], (err,data)=>{
				if(err){console.error(err);flag = 0;}
			});
			fs.writeFile(outputfile_path, X[1], (err,data)=>{
				if(err){console.error(err);flag = 0;}
			});
			if(flag) vscode.window.showInformationMessage('Input/Output file created!');
		}
		  
		function seperate(Data){
			var lines = Data.split('\n');
			var n = lines.length;
			var input = "";
			var output = "";
			for(var i=0;i<n;i++){
				var x = lines[i].indexOf("--input");
				if(x == -1){
					output += lines[i] + "\r\n";
				}
				else{
					input += lines[i].substring(0,x) + "\r\n";
				}
			} 
			return [input , output];
		}
		

	}


	context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}

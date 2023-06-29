import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import * as math from 'mathjs';
import { TagModel } from 'ngx-chips/core/tag-model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Salary Calculator';
  salaryForm: FormGroup;
  showDropdown = {};  // To toggle visibility of dropdowns
  fields = ['basicPay', 'hra', 'pf', 'incomeTax', 'transportAllowance', 'medicalInsurance','gratuity'];  // Available fields for formulas
  dependencies = {};
  dependents = {};
  
  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit() {
    this.salaryForm = this.fb.group({});

    for (let field of this.fields) {
      this.salaryForm.addControl(field, this.fb.group({
        type: 'value',
        content: ''
      }));
      this.showDropdown[field] = false;
    }

    for (let field of this.fields) {
      this.dependencies[field] = [];
      this.dependents[field] = [];
    }
  }

  dropdownFields(field: string) {
    // only include fields that the current field does not depend on
    // and fields that do not depend on the current field
    const arr = this.fields.filter(f => f !== field && !this.dependencies[field].includes(f) && !this.dependents[field].includes(f));
    return arr;
  }

  selectField(field: string, selectedField: string) {
    // Add selectedField to the list of dependencies for the current field
    if (!this.dependencies[field]) {
      this.dependencies[field] = [];
    }
    this.dependencies[field].push(selectedField);

    // Add current field to the list of dependents for the selectedField
    if (!this.dependents[selectedField]) {
      this.dependents[selectedField] = [];
    }
    this.dependents[selectedField].push(field);

    if (this.hasCircularDependency(field)) {
      window.alert('This will cause a circular dependency!');
      // Remove the dependency
      this.dependencies[field] = this.dependencies[field].filter(dependency => dependency !== selectedField);
      // Remove the dependent
      this.dependents[selectedField] = this.dependents[selectedField].filter(dependent => dependent !== field);
      return;
    }

    let fieldControl = this.salaryForm.get(field).get('content');
    fieldControl.setValue(fieldControl.value + selectedField);
    this.showDropdown[field] = false;  // Hide dropdown
  }

  onFormulaChange(field: string) {
    let formula = this.salaryForm.get(field).get('content').value;
    let matches = formula.match(/\b\w+\b/g);

    let newDependencies = matches ? matches.filter(f => this.fields.includes(f)) : [];

    // Remove old dependents for field
    for (let f of this.dependencies[field]) {
      this.dependents[f] = this.dependents[f].filter(dependent => dependent !== field);
    }

    this.dependencies[field] = newDependencies;

    // Add new dependents for field
    for (let f of newDependencies) {
      if (!this.dependents[f]) {
        this.dependents[f] = [];
      }
      this.dependents[f].push(field);
    }

    if (this.hasCircularDependency(field)) {
      window.alert('This will cause a circular dependency!');
      this.salaryForm.get(field).get('content').reset();
    }
  }
  
 
  keydown(field: string, event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Tab','Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown','0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const operators = [ '+', '-', '*', '/', '(', ')', '.', '%'];

    if(this.salaryForm.controls[field].value.type === 'formula'){
      allowedKeys.push(...operators);
      }
  
    if (event.ctrlKey && event.key === ' ' && this.salaryForm.controls[field].value.type === 'formula' ) {  // Check for ctrl + space
      event.preventDefault();
      this.showDropdown[field] = !this.showDropdown[field];  // Toggle dropdown visibility
    } else if (!allowedKeys.includes(event.key)) {
      // Prevent entering any non-allowed characters
      event.preventDefault();
    }
    if (event.key === 'Backspace') {
      const cursorPosition = (event.target as HTMLInputElement).selectionStart!;
      const formulaBeforeCursor = this.salaryForm.get(field).get('content').value.slice(0, cursorPosition-1);
      const lastVariableRegex = /([a-zA-Z_][a-zA-Z0-9_]*)$/;
      const match = lastVariableRegex.exec(formulaBeforeCursor);
      if (match && match[1]) {
        const variableToDelete = match[1];
        const updatedFormula = this.salaryForm.get(field).get('content').value.replace(variableToDelete, '');
        this.salaryForm.get(field).get('content').setValue(updatedFormula);
      }
    }
  }

  
  submitForm() {
    const formValue = this.salaryForm.value;

    // Prepare payload based on form value
    const payload = {
      fieldOptions: {},
      formulas: {},
      userValues: {}
    };

    for (const field in formValue) {
      // if both value and formula are empty
      if (formValue[field].type === 'value' && !formValue[field].content) {
        window.alert(`Value cannot be empty for ${field}`);
        return;
      } else if (formValue[field].type === 'formula' && !formValue[field].content) {
        window.alert(`Formula cannot be empty for ${field}`);
        return;
      }
    }

    for (const field in formValue) {
      if (formValue[field].type === 'value') {
        payload.fieldOptions[field] = 'value';
        payload.userValues[field] = Number(formValue[field].content);
      } else if (formValue[field].type === 'formula') {
        const formula = formValue[field].content;
        if (!this.validateFormula(formula)) {
          console.error(`Formula for ${field} is not valid.`);
          window.alert(`Formula for ${field} is not valid`);
          return;
        }
        payload.fieldOptions[field] = 'formula';
        payload.formulas[field] = formula;
      }
    }

    console.log(payload);
    const headers = new HttpHeaders().set('Content-Type', 'application/json');

    // POST request with headers
    this.http.post('http://localhost:8080/api/fields', JSON.stringify(payload), { headers: headers }).subscribe(response => {
      console.log(response);
    }, error => {
      console.error(error);
    });
  }


  validateFormula(formula: string): boolean {
    try {
      /* mathjs library function to parse formula, you need to import it */
      math.parse(formula);

      // Check for consecutive operators
      const operators = ['+', '-', '*', '/'];
      for (let i = 0; i < formula.length - 1; i++) {
        if (operators.includes(formula[i]) && operators.includes(formula[i + 1])) {
          console.error(`Invalid syntax in formula: ${formula}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Invalid formula: ${formula}`);
      return false;
    }
  }


  hasCircularDependency(field: string, visited = {}, recStack = {}): boolean {
    if (!visited[field]) {
      // Mark the current node as visited and part of recursion stack
      visited[field] = true;
      recStack[field] = true;
  
      // Visit all the vertices adjacent to this field
      if (this.dependencies[field]) {
        for (let dep of this.dependencies[field]) {
          if (!visited[dep] && this.hasCircularDependency(dep, visited, recStack)) {
            return true;
          } else if (recStack[dep]) {
            return true;
          }
        }
      }
    }
  
    recStack[field] = false;  // Remove the field from recursion stack
    return false;
  }

}
  // selectField(field: string, selectedField: string) {
  //   // Add selectedField to the list of dependencies for the current field
  //   if (!this.dependencies[field]) {
  //     this.dependencies[field] = [];
  //   }
  //   this.dependencies[field].push(selectedField);

  //   if (this.hasCircularDependency(field)) {
  //     window.alert('This will cause a circular dependency!');
  //     // Remove the dependency
  //     this.dependencies[field] = this.dependencies[field].filter(dependency => dependency !== selectedField);
  //     return;
  //   }

  //   let fieldControl = this.salaryForm.get(field).get('content');
  //   fieldControl.setValue(fieldControl.value + selectedField);
  //   this.showDropdown[field] = false;  // Hide dropdown
  // }



    // this.salaryForm = this.fb.group({
    //   basicPay: this.fb.group({
    //     type: 'value',
    //     content: ''
    //   }),
    //   hra: this.fb.group({
    //     type: 'value',
    //     content: ''
    //   }),
    //   pf: this.fb.group({
    //     type: 'value',
    //     content: ''
    //   }),
    //   incomeTax: this.fb.group({
    //     type: 'value',
    //     content: ''
    //   }),
    //   transportAllowance: this.fb.group({
    //     type: 'value',
    //     content: ''
    //   }),
    //   medicalInsurance: this.fb.group({
    //     type: 'value',
    //     content: ''
    //   })
    // });

    // Initialize dropdown visibility
    // for (let field of this.fields) {
    //   this.showDropdown[field] = false;
    // }



      // dropdownFields(field: string) {
  //   this.arr = this.fields.filter(f => f !== field && !this.hasCircularDependency(f));
  //   return this.arr;
  // }

  // dropdownFields(field: string) {
  //   const dependentFields = this.getDependentFields(field);
  //   const dependentOnFields = this.getFieldsDependentOn(field);
    
  //   this.arr = this.fields.filter(f => f !== field && !dependentFields.includes(f) && !dependentOnFields.includes(f));
    
  //   return this.arr;
  // }
  
  // getDependentFields(field: string): string[] {
  //   const dependentFields: string[] = [];
    
  //   for (let f in this.dependencies) {
  //     if (this.dependencies[f].includes(field)) {
  //       dependentFields.push(f);
  //     }
  //   }
    
  //   return dependentFields;
  // }
  
  // getFieldsDependentOn(field: string): string[] {
  //   if (!this.dependencies[field]) {
  //     return [];
  //   }
    
  //   return this.dependencies[field];
  // }
  

   // keydown(field: string, event: KeyboardEvent) {
  //   if (event.ctrlKey && event.key === ' ') {  // Check for ctrl + space
  //     event.preventDefault();
  //     this.showDropdown[field] = !this.showDropdown[field];  // Toggle dropdown visibility
  //   }
  // }
  
  // Called when a key is pressed in a formula field
  // keydown(field: string, event: KeyboardEvent) {
  //   const allowedKeys = ['Backspace', 'Tab','Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown','0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  //   const operators = [ '+', '-', '*', '/', '(', ')', '.', '%'];

    // if(this.salaryForm.controls[field].value.type === 'formula'){
    // allowedKeys.push(...operators);
    // }

  //   if (event.ctrlKey && event.key === ' ' && this.salaryForm.controls[field].value.type === 'formula') {
  //       event.preventDefault();
  //     this.showDropdown[field] = !this.showDropdown[field];  
  //   } else if (!allowedKeys.includes(event.key)) {
  //     event.preventDefault();
  //   }

  // }


    // validateFormula(formula: string): boolean {
  //   try {
  //     /* mathjs library function to parse formula, you need to import it */
  //     math.parse(formula);
  //     return true;
  //   } catch (error) {
  //     console.error(`Invalid formula: ${formula}`);
  //     return false;
  //   }
  // }
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Make sure to import this
import { HttpClientModule } from '@angular/common/http';
import { NgxKeyboardEventsModule } from 'ngx-keyboard-events';

import { AppComponent } from './app.component';
import { NgSelectModule } from '@ng-select/ng-select';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { TagInputModule } from 'ngx-chips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule, // And add it to the imports array
    HttpClientModule,
    ReactiveFormsModule,
    NgxKeyboardEventsModule,
    NgSelectModule,
    NgbModule,
    BrowserAnimationsModule, 
    TagInputModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

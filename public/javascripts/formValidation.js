$(function() {

  $.validator.addMethod('strongPassword',function(value){

    return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/.test(value);

  },"Password should have alteast 8 characters, 1 number, 1 lowecase, 1 uppercase and no special characters");

  $("form[name='registration']").validate({

    
    // Specify validation rules
    rules: {
      // The key name on the left side is the name attribute
      // of an input field. Validation rules are defined
      // on the right side
      firstname: "required",
      lastname: "required",
      username: "required",
      password: {
        required: true,
        strongPassword : true
      },
      email: {
        required: true,
        email: true
        //email1:true
      },
    },
    // Specify validation error messages
    messages: {
      firstname: "Please enter your firstname",
      lastname: "Please enter your lastname",
      username: "Please enter your username",
      password: {
        required: "Please provide a password"
      },
      email: "Please enter a valid email address"
    }
    // Make sure the form is submitted to the destination defined
    // in the "action" attribute of the form when valid
    // submitHandler: function(form) {
    //   form.submit();
    // }
  });
});




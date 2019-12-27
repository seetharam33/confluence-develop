$(document).ready(function(){
    var state=[];
    var department=[];
    var city=[];
    $(".state").each(function(){
            if(state.indexOf(this.value)>-1)
            {   
                this.setAttribute("class", "hidden");
            }
            else {
                state.push(this.value);
            }
    });
    $(".department").each(function(){
        if(department.indexOf(this.value)>-1)
            {   
                this.setAttribute("class", "hidden");
            }
            else {
                department.push(this.value);
            }
    });
    $(".city").each(function(){
        if(city.indexOf(this.value)>-1)
            {   
                this.setAttribute("class", "hidden");
            }
            else {
                city.push(this.value);
            }
    });
}); 
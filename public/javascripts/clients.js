// get country phone codes
$(document).ready(function(){
  $("#country").on("input",async function(){
    let keyword = $(this).val().trim().toLowerCase();
    const localData = checkInLs("countryCode");
    if(localData.isExist)
    {
      const countries = localData.data;
      for(let country of countries)
      {
        if(country.name.toLowerCase().indexOf(keyword) != -1)
        {
          let dialCode = country.dial_code;
          $("#code").html(dialCode);
        }
      }
    }
    else {
      const request = {
        type: "GET",
        url: "../json/country-code.json"
      }
      const response = await ajax(request);
      const countryData = JSON.stringify(response);
      localStorage.setItem("countryCode",countryData);
    }
  });
});

// open modal
$(document).ready(function(){
  $("#add-client-btn").click(function(){
    $("#clientForm").addClass("add-client-form");
    $("#clientForm").removeClass("update-client-form");
    $(".add-client-submit").html("Submit");
    $(".add-client-submit").removeClass("btn-danger px-3");
    $(".add-client-submit").addClass("btn-primary");
    $("#clientModal").modal('show');
    addClient();
  });
});

// add client
function addClient(){
  $(".add-client-form").submit(async function(e){
    e.preventDefault();
    const token = getCookie("authToken");
    const formdata = new FormData(this);
    formdata.append("token",token);

    const request = {
      type: "POST",
      url: "/clients",
      data: formdata,
      isLoader: true,
      commonBtn: ".add-client-submit",
      loaderBtn: ".add-client-loader"
    }
    try {
      const dataRes = await ajax(request);
      const client = dataRes.data;

      // prevent from multiple submit
      $(".add-client-form").unbind();


      $("#clientModal").modal('hide');
      const tr = dynamicTr(client);
      $("table").append(tr);
      // activate edit delete or share
      clientAction();
    }
    catch(error)
    {
      $("#addClientEmail").addClass("animate__animated animate__shakeX text-danger");
      $("#addClientEmail").click(function(){
        $(this).removeClass("animate__animated animate__shakeX text-danger");
        $(this).val("");
      });
    }
  });
};

// update client
function updateClient(oldTr){
  $(".update-client-form").submit(async function(e){
    e.preventDefault();
    const id = $(this).data("id");
    const token = getCookie("authToken");
    const formdata = new FormData(this);
    formdata.append("token",token);
    formdata.append("updatedAt",new Date());
    const request = {
      type: "PUT",
      url: "/clients/"+id,
      isLoader: true,
      commonBtn: ".add-client-submit",
      loaderBtn: ".add-client-loader",
      data: formdata
    }
    const response = await ajax(request);
    const client = response.data;
    const tr = dynamicTr(client);
    const updatedTd = $(tr).html();
    $(oldTr).html(updatedTd);
    $("#clientModal").modal('hide');
    clientAction();
  });
};

// show clients
$(document).ready(function(){
  let from = 0;
  let to = 5;
  showClients(from,to);
  getPaginationList();
});

async function showClients(from,to) {
  $("table").html(`
    <tr>
      <th>Client</th>
      <th>Email</th>
      <th>Mobile</th>
      <th>Status</th>
      <th>Date</th>
      <th>Action</th>
    </tr>
  `);
  const request = {
    type: "GET",
    url: `/clients/${from}/${to}`,
    isLoader: true,
    commonBtn: ".tmp",
    loaderBtn: ".clients-skeleton"
  }
  const response = await ajax(request);

  if(response.data.length > 0)
  {
    let currentClients = JSON.stringify(response.data);
    sessionStorage.setItem("current-client",currentClients);

    for(let client of response.data)
    {
      const tr = dynamicTr(client);
      $("table").append(tr);
    }
    clientAction();
  }
  else {
    alert("client not found");
  }
}

function clientAction() {
    // delete clients
    $(document).ready(function(){
      $(".delete-client").each(function(){
        $(this).click(async function(){
          let tr = this.parentElement.parentElement.parentElement;//div->td->tr
          const id = $(this).data("id");
          const token = getCookie("authToken");
          const request = {
            type: "DELETE",
            url: "/clients/"+id,
            data: {
              token: token
            }
          }

          const response = await ajax(request);
          $(tr).removeClass("animate__animated animate__fadeIn");
          $(tr).addClass("animate__animated animate__fadeOut");
          setTimeout(function(){
            $(tr).remove();
          },500)
        });
      });
    });

    // edit clients
    $(document).ready(function(){
      $(".edit-client").each(function(){
        $(this).click(function(){
          let tr = this.parentElement.parentElement.parentElement;
          const id = $(this).data("id");
          const clientString = $(this).data("client");
          let clientData = clientString.replace(/'/g,'"');
          let client = JSON.parse(clientData);
          for(let key in client)
          {
            let value = client[key];
            $(`[name=${key}]`,"#clientForm").val(value);
          }
          $("#clientForm").attr("data-id",id);
          $("#clientForm").removeClass("add-client-form");
          $("#clientForm").addClass("update-client-form");
          $(".add-client-submit").html("Save");
          $(".add-client-submit").removeClass("btn-primary");
          $(".add-client-submit").addClass("btn-danger px-3");
          $("#clientModal").modal('show');
          updateClient(tr);
        });
      });
    });

    // open share modal
    $(document).ready(function(){
      $(".share-client").click(async function(){
        const clientId = $(this).data("id");
        const clientEmail = $(this).data("email");
        $(".share-on-email").attr("data-email",clientEmail);
        const companyToken = getCookie("authToken");
        const tmp = decodeToken(companyToken);
        const company = tmp.data.companyInfo;

        const prepareDataForToken = JSON.stringify({
          clientId: clientId,
          companyName: company.company_name,
          email: company.email,
          logo: company.logoUrl
        });

        const formdata = new FormData();
        formdata.append("token",getCookie("authToken"));
        formdata.append("data",prepareDataForToken);

        const request = {
          type: "POST",
          url: "/get-token/172800",
          data: formdata
        }

        const response = await ajax(request);

        const token = response.token;

        let link = `${window.location}/invitation/${token}`;
        $(".link").val(link);
        $("#shareModal").modal('show');
      });
    });

    // prevent from link changes
    $(document).ready(function(){
      $(".link").on("keydown",function(){
        return false;
      });
    });

    // copy link
    $(document).ready(function(){
      $(".copy-link").click(function(){
        const linkInput = document.querySelector(".link");
        linkInput.select();
        document.execCommand('copy');
        $("i",this).removeClass("fa fa-copy");
        $("i",this).addClass("fa fa-check");
        setTimeout(()=>{
          $("i",this).removeClass("fa fa-check");
          $("i",this).addClass("fa fa-copy");
        },2000);
      });
    });

    // share on email
    $(document).ready(function(){
      $(".share-on-email").click(async function(){
        const clientEmail = $(this).data("email");
        const token = getCookie("authToken");
        const tokenData = decodeToken(token);
        const company = tokenData.data.companyInfo;
        const formdata = new FormData();
        formdata.append("token",token);
        const receipt = {
          to: clientEmail,
          subject: "Business Invitation",
          message: "Thank you being the part of our business. We are happy to serve our services for you",
          companyName: company.company_name,
          companyMobile: company.mobile,
          companyEmail: company.email,
          invitationLink: $(".link").val(),
          companyLogo: company.logoUrl
        }

        let string = JSON.stringify(receipt);
        formdata.append("reciept",string);
        const request = {
          type: "POST",
          url: "/sendmail",
          data: formdata,
          isLoader: true,
          commonBtn: ".tmp",
          loaderBtn: ".progressive-loading"
        }
        try {
          const response = await ajax(request);
          $("#shareModal").modal("hide");
        }
        catch(err)
        {
          console.log(err);
        }
      });
    });
}

function dynamicTr(client) {
  let clientString = JSON.stringify(client);
  let clientData = clientString.replace(/"/g,"'");

  const tr = `
    <tr class="animate__animated animate__fadeIn">
      <td>
        <div class="d-flex align-items-center">
          <i class="fa fa-user-circle mr-3" style="font-size:45px"></i>
          <div>
            <p class="p-0 m-0 text-capitalize client-name">${client.clientName}</p>
            <small class="text-uppercase">${client.clientCountry}</small>
          </div>
        </div>
      </td>
      <td class="client-email">
        ${client.clientEmail}
      </td>
      <td>
        ${client.clientMobile}
      </td>
      <td>
        <span class="badge badge-danger">Offline</span>
      </td>
      <td>
        ${formatDate(client.createdAt)}
      </td>
      <td>
        <div class="d-flex">
          <button class="icon-btn-primary mr-3 edit-client" data-id="${client._id}" data-client="${clientData}">
            <i class="fa fa-edit"></i>
          </button>

          <button class="icon-btn-danger mr-3 delete-client" data-id="${client._id}">
            <i class="fa fa-trash"></i>
          </button>

          <button class="icon-btn-info share-client" data-id="${client._id}" data-email="${client.clientEmail}">
            <i class="fa fa-share-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
  return tr;
}

function checkInLs(key) {
  if(localStorage.getItem(key) != null)
  {
    let tmp = localStorage.getItem(key);
    const data = JSON.parse(tmp);
    return {
      isExist: true,
      data: data
    }
  }
  else {
    return {
      isExist: false
    }
  }

}

async function getPaginationList() {
  const request = {
    type: "GET",
    url: "/clients/count-all"
  }
  const response = await ajax(request);
  const totalClient = response.data;
  let length = totalClient/5;
  let dataSkip = 0;
  let i;
  if(length.toString().indexOf(".") != -1)
  {
    length = length+1;
  }
  for(i=1;i<=length;i++)
  {
    let button = `
      <button class="btn border paginate-btn ${i == 1 ? 'active':''}" data-skip="${dataSkip}">
        ${i}
      </button>
    `;
    $("#client-pagination").append(button);
    dataSkip = dataSkip+5;
  }
  getPaginationData();

}

function getPaginationData() {
  $(".paginate-btn").each(function(index){
    $(this).click(function(){
      controlPrevAndNext(index);
      removeClasses("active");
      $(this).addClass("active");
      const skip = $(this).data("skip");
      showClients(skip,5);
    });
  });
}

function removeClasses(className) {
  $("."+className).each(function(){
    $(this).removeClass(className);
  });
}

$(document).ready(function(){
  $("#next").click(function(){
    let currentIndex = 0;
    $(".paginate-btn").each(function(){
      if($(this).hasClass("active"))
      {
        currentIndex = $(this).index();
      }
    });
    $(".paginate-btn").eq(currentIndex+1).click();
    controlPrevAndNext(currentIndex+1);
  });
});

$(document).ready(function(){
  $("#prev").click(function(){
    let currentIndex = 0;
    $(".paginate-btn").each(function(){
      if($(this).hasClass("active"))
      {
        currentIndex = $(this).index();
      }
    });
    $(".paginate-btn").eq(currentIndex-1).click();
    controlPrevAndNext(currentIndex-1);
  });
});

function controlPrevAndNext(currentIndex)
{
  const totalBtn = $(".paginate-btn").length-1;
  if(currentIndex == totalBtn)
  {
    $("#next").prop("disabled",true);
  }
  else if(currentIndex > 0)
  {
    $("#prev").prop("disabled",false);
    $("#next").prop("disabled",false);
  }
  else {
    $("#prev").prop("disabled",true);
    $("#next").prop("disabled",false);
  }
}

// control filter
$(document).ready(function(){
  filterByName();
  $(".filter-btn").click(function(){
    if($(".filter").hasClass("filter-by-name"))
    {
      $(".filter").removeClass("filter-by-name");
      $(".filter").addClass("filter-by-email");
      $(".filter").attr("placeholder","Search by email");
      filterByEmail();
    }
    else {
      $(".filter").removeClass("filter-by-email");
      $(".filter").addClass("filter-by-name");
      $(".filter").attr("placeholder","Search by name");
    }
  });
});

// filter by name
function filterByName(){
  $(".filter-by-name").on("input",function(){
    let tr = "";
    let keyword = $(this).val().trim().toLowerCase();
    $(".client-name").each(function(){
      let clientName = $(this).html().toLowerCase();
      if(clientName.indexOf(keyword) == -1)
      {
        tr = $(this).parent().parent().parent().parent();
        $(tr).addClass("d-none");
      }
      else {
        tr = $(this).parent().parent().parent().parent();
        $(tr).removeClass("d-none");
      }
    });
  });
};

// filter by email
function filterByEmail(){
  $(".filter-by-email").on("input",function(){
    let tr = "";
    let keyword = $(this).val().trim().toLowerCase();
    $(".client-email").each(function(){
      let clientEmail = $(this).html().toLowerCase();
      if(clientEmail.indexOf(keyword) == -1)
      {
        tr = $(this).parent();
        $(tr).addClass("d-none");
      }
      else {
        tr = $(this).parent();
        $(tr).removeClass("d-none");
      }
    });
  });
};

// export to pdf
$(document).ready(function(){
  $("#current").click(async function(e){
    e.preventDefault();
    let currentClients = sessionStorage.getItem("current-client");
    if(currentClients != null)
    {
      const formdata = new FormData();
      formdata.append("data",currentClients);
      formdata.append("token",getCookie("authToken"));
      const request = {
        type: "POST",
        url: "/export-to-pdf",
        data: formdata
      }
      try {
            const response = await ajax(request);
            console.log(response);

            const downloadRequest = {
              type: "GET",
              url: "/exports/"+response.filename
            }

            const pdfFile = await ajaxDownloader(downloadRequest);
            const pdfUrl = URL.createObjectURL(pdfFile);
            const a = document.createElement("a");
            a.href = pdfUrl;
            a.download = response.filename;
            a.click();
            a.remove();
            deletePdf(response.filename);
      }
      catch(err)
      {
        console.log(err);
      }

    }
    else {
      alert("Clients not found");
    }
  });
});

$(document).ready(function(){
  $("#all").click(async function(){
    const token = getCookie("authToken");
    const company = decodeToken(token);
    const companyId = company.data.companyInfo._id;
    const clientRequest = {
      type: "GET",
      url: "/clients/all/"+companyId
    }
    const response = await ajax(clientRequest);
    const allClients = JSON.stringify(response.data);
    const formdata = new FormData();
    formdata.append("data",allClients);
    formdata.append("token",token);
    const request = {
      type: "POST",
      url: "/export-to-pdf",
      data: formdata
    }
    try {
          const response = await ajax(request);
          console.log(response);

          const downloadRequest = {
            type: "GET",
            url: "/exports/"+response.filename
          }

          const pdfFile = await ajaxDownloader(downloadRequest);
          const pdfUrl = URL.createObjectURL(pdfFile);
          const a = document.createElement("a");
          a.href = pdfUrl;
          a.download = response.filename;
          a.click();
          a.remove();
          deletePdf(response.filename);
    }
    catch(err)
    {
      console.log(err);
    }
  });
});

async function deletePdf(filename)
{
  const token = getCookie("authToken");
  const request = {
    type: "DELETE",
    url: "/export-to-pdf/"+filename,
    data: {
      token: token
    }
  }
  await ajax(request);
}

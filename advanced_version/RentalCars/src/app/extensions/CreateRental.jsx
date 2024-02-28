import React, { useState, useEffect } from "react";
import _ from 'lodash';
import moment from 'moment';
import {
  Divider,
  Button,
  Flex,
  hubspot,
  DateInput,
  NumberInput,
  MultiSelect,
  Select,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Text,
  Input,
  LoadingSpinner,
  StepIndicator,
  Link,
  DescriptionList,
  DescriptionListItem,
  ToggleGroup
} from "@hubspot/ui-extensions";

import {
  CrmCardActions,
  CrmActionLink,
  CrmActionButton
} from '@hubspot/ui-extensions/crm';


function sortAndPaginateLocations(locations, sortBy, sortOrder, page, pageSize) {

if (sortBy === 'distance') {
  locations.sort((a, b) => a.distance - b.distance);
} else if (sortBy === 'available_vehicles') {
  locations.sort((a, b) => b.number_of_available_vehicles - a.number_of_available_vehicles);
} else if (sortBy === 'vehicle_match') {
  locations.sort((a, b) => b.associations.p_vehicles_collection__vehicles_to_locations.total - a.associations.p_vehicles_collection__vehicles_to_locations.total);
}

if (sortOrder === 'desc') {
  locations.reverse();
}

const start = (page - 1) * pageSize;
const end = page * pageSize;
return locations.slice(start, end);

}

function sortAndPaginateVehicles(vehicles, vehicleYearSort, vehiclePage, pageSize){
  if (vehicleYearSort === 'asc') {
    vehicles.sort((a, b) => a.properties.year - b.properties.year);
  } else if (vehicleYearSort === 'desc') {
    vehicles.sort((a, b) => b.properties.year - a.properties.year);
  }

  const start = (vehiclePage - 1) * pageSize;
  const end = vehiclePage * pageSize;
  return vehicles.slice(start, end);
}


// Define the extension to be run within the Hubspot CRM
hubspot.extend(({ context, runServerlessFunction, actions }) => (
    <Extension
      context={context}
      runServerless={runServerlessFunction}
      sendAlert={actions.addAlert}
      fetchProperties={actions.fetchCrmObjectProperties}
    />
  ));

  const Extension = ({ context, runServerless, sendAlert, fetchProperties }) => {

    const [locations, setLocations] = useState([]);
    const [locationsOnPage, setLocationsOnPage] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [vehiclesOnPage, setVehiclesOnPage] = useState([]);

    const [selectedLocation, setSelectedLocation] = useState({});
    const [selectedVehicle, setSelectedVehicle] = useState({});


    const [steps, setSteps] = useState([
        "Location",
        "Vehicle",
        "Confirm"
    ]);

    const [currentStep, setCurrentStep] = useState(0);
    const [zipCode, setZipCode] = useState(37064);
    const [miles, setMiles] = useState(250);

    const [loading, setLoading] = useState(true);
    const [pickupDate, setPickupDate] = useState(null);
    const [returnDate, setReturnDate] = useState(null);
    const [vehicleClass, setVehicleClass] = useState("");

    const [isValid, setIsValid] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');

    const [distanceSort, setDistanceSort] = useState('asc'); //asc, desc, ''
    const [vehicleSort, setVehicleSort] = useState(''); //asc, desc, ''
    const [vehicleMatchSort, setVehicleMatchSort] = useState(''); //asc, desc, ''

    const [vehicleYearSort, setVehicleYearSort] = useState('desc'); //asc, desc, ''

    const [locationPage, setLocationPage] = useState(1);
    const [locationCount, setLocationCount] = useState(0);
    const [vehiclePage, setVehiclePage] = useState(1);
    const [vehicleCount, setVehicleCount] = useState(6);

    const [pageSize, setPageSize] = useState(10);
    const [locationFetching, setLocationFetching] = useState(false);
    const [vehicleFetching, setVehicleFetching] = useState(false);

    const [geography, setGeography] = useState({ lat: 35.89872340000001, lng: -86.96240859999999 });
    const [geoCodeFetching, setGeoCodeFetching] = useState(false);

    const [insurance, setInsurance] = useState(false);
    const [insuranceCost, setInsuranceCost] = useState(0);

    const [days, setDays] = useState(0);

    function geoCode() {
      sendAlert({ message: "Geocoding...", type: "info" });
      setGeoCodeFetching(true);
      runServerless({ name: "geoCode", parameters: {"zipCode": zipCode} }).then((resp) => {
        setGeography(resp.response);
        setGeoCodeFetching(false);
      })
    }

    function fetchLocations() {
      sendAlert({ message: "Fetching locations...", type: "info" });
      setLocationFetching(true);
      runServerless({ name: "getLocations", parameters: { "miles": miles, "geography": geography, "pickupDate": pickupDate, "returnDate": returnDate, "vehicleClass": vehicleClass}}).then((resp) => {
        setLocations(resp.response.results);
        setLocationCount(resp.response.total);
        setLocationFetching(false);
        //reset the table
        setLocationPage(1);
      })

    }

    const debouncedFetchLocations = _.debounce(fetchLocations, 500);

    const debounceGeoCode = _.debounce(geoCode, 500);

    //run the fetchLocations, when the distanceSort or vehicleSort changes or when the page changes
    useEffect(() => {
        debouncedFetchLocations();
    }, [miles, geography]);

    useEffect(() => {
      if (zipCode.length === 5 && !geoCodeFetching) {
        debounceGeoCode();
      }
    }, [zipCode]);

    useEffect(() => {
      let sort = {};
      if (distanceSort) {
        sort = { "name": "distance", "order": distanceSort };
      } else if (vehicleSort) {
        sort = { "name": "available_vehicles", "order": vehicleSort };
      }
      else if (vehicleMatchSort) {
        sort = { "name": "vehicle_match", "order": vehicleMatchSort };
      }

      if (locations.length > 0) {
        let newLocations = sortAndPaginateLocations(locations, sort.name, sort.order, locationPage, pageSize)
        setLocationsOnPage(newLocations);
      }
    }, [distanceSort, vehicleSort, vehicleMatchSort, locationPage, pageSize, locations]);


    useEffect(() => {
      if (vehicles.length > 0) {
        let newVehicles = sortAndPaginateVehicles(vehicles, vehicleYearSort, vehiclePage, pageSize)
        setVehiclesOnPage(newVehicles);
      }
    }, [vehicleYearSort, vehiclePage, vehicles]);


    function setSort(sort, type) {
      if (type === 'distance') {
        setDistanceSort(sort);
        setVehicleSort('');
        setVehicleMatchSort('');
      }
      else if (type === 'vehicle_match') {
        setVehicleMatchSort(sort);
        setDistanceSort('');
        setVehicleSort('');
      }
      else {
        setVehicleSort(sort);
        setDistanceSort('');
        setVehicleMatchSort('');
      }
    }

    useEffect(() => {
      if (pickupDate && returnDate) {
        let days = moment(returnDate.formattedDate).diff(moment(pickupDate.formattedDate), 'days');
        setDays(days);
      }
    }, [pickupDate, returnDate]);


    function goToVehiclePage(vehicles) {
      setVehicleFetching(true)
      runServerless({ name: "getVehicles", parameters: { "vehicles": vehicles}}).then((resp) => {
        setVehicles(resp.response.data.results);
        setVehicleCount(resp.response.data.results.length);
        setCurrentStep(1);
        setVehicleFetching(false);
      })
    }

    function goToBookingPage(vehicle) {
      setSelectedVehicle(vehicle);
      setCurrentStep(2);
    }

    return (
        <>
          <Flex
          direction={'row'}
          justify={'between'}
          >
          <StepIndicator
            currentStep={currentStep}
            stepNames={steps}
            variant={"default"}
            onClick={(step) => {
              //make sure that the step is valid before allowing the user to go to the next step
              if (step === 1) {
                if (selectedLocation && selectedLocation.id) {
                  setCurrentStep(step);
                }
                else {
                  sendAlert({ message: "Please select a location", type: "danger" });
                }
              }
              else {
                setCurrentStep(step);
              }
            }}
            />
          </Flex>
          <Divider />
          {currentStep === 0 && (
          <>
              <Flex
                direction={'row'}
                justify={'start'}
                wrap={'nowrap'}
                gap={'extra-large'}
                align={'start'}
                alignSelf={'start'}
              >
              <Flex
                width={'auto'}
              >
              <Input
                      label="Zip Code"
                      name="zipCode"
                      tooltip="Please enter your zip code"
                      placeholder="12345"
                      value={zipCode}
                      required={true}
                      onChange={value => {
                        setZipCode(value);
                      }}

                    />
              </Flex>
              <Flex
                width={'auto'}
              >
                    <NumberInput
                      label="Miles"
                      name="miles"
                      min={25}
                      max={300}
                      tooltip="Please enter the number of miles you are willing to travel"
                      placeholder="250"
                      value={miles}
                      required={true}
                      onChange={value => {
                        setMiles(value);
                      }}
                    />
                </Flex>
                <Flex
                  width={'auto'}
                >
                 <DateInput
                   label="Pickup Date"
                   name="pickupDate"
                   value={pickupDate}
                   max={returnDate}
                   onChange={(value) => {
                     setPickupDate(value);
                   }}
                   format="ll"
                  />
                 </Flex>
                 <Flex
                   width={'auto'}
                 >
                  <DateInput
                    label="Return Date"
                    name="returnDate"
                    value={returnDate}
                    min={pickupDate}
                    onChange={(value) => {
                      setReturnDate(value);
                    }}
                    format="ll"
                    />
                  </Flex>
                  <Flex
                    width={'max'}
                  >
                  <MultiSelect
                    label="Vehicle Class"
                    name="vehicleClass"
                    variant="transparent"
                    options={[
                      { label: "Touring", value: "Touring" },
                      { label: "Sport", value: "Sport" },
                      { label: "Base", value: "Base" },
                      { label: "Economy", value: "Economy" },
                      { label: "Compact", value: "Compact" },
                      { label: "Midsize", value: "Midsize" },
                      { label: "Standard", value: "Standard" },
                      { label: "Fullsize", value: "Fullsize" },
                      { label: "Premium", value: "Premium" },
                      { label: "Luxury", value: "Luxury" },
                      { label: "SUV", value: "SUV" },
                      { label: "Van", value: "Van" },
                      { label: "Truck", value: "Truck" },
                      { label: "Convertible", value: "Convertible" },
                      { label: "Coupe", value: "Coupe" },
                    ]}
                    onChange={(value) => {
                      setVehicleClass(value);
                    }}
                    />
                  </Flex>

                  </Flex>

                  <Divider />

                  <Table
                    width={'max'}
                    paginated={true}
                    pageCount={locationCount / pageSize}
                    onPageChange={(page) => {
                      setLocationPage(page);
                    }}
                    page={locationPage}
                  >
                    <TableHead>
                    <TableRow>
                      <TableHeader width={'min'}>Address</TableHeader>
                      <TableHeader width={'min'}>
                        <Link variant="dark"
                          onClick={() => setSort(distanceSort === 'asc' ? 'desc' : 'asc', 'distance')}
                        >
                          Distance
                        </Link>  {distanceSort === '' ? ' ' : distanceSort === 'asc' ? ' ↓' : ' ↑'}
                      </TableHeader>
                      <TableHeader width={'min'}>
                        <Link variant="dark"
                          onClick={() => setSort(vehicleSort === 'asc' ? 'desc' : 'asc', 'vehicle')}
                        >
                          Availablity
                        </Link>
                         {vehicleSort === '' ? ' ' : vehicleSort === 'asc' ? ' ↓' : ' ↑'}
                      </TableHeader>
                      <TableHeader width={'min'} >
                      <Link variant="dark"
                        onClick={() => setSort(vehicleMatchSort === 'asc' ? 'desc' : 'asc', 'vehicle_match')}
                      >
                        Vehicles that meet Filters
                      </Link>
                       {vehicleMatchSort === '' ? ' ' : vehicleMatchSort === 'asc' ? ' ↓' : ' ↑'}
                      </TableHeader>
                    </TableRow>
                    </TableHead>
                    <TableBody>

                    {locationFetching === false && locationsOnPage.map((location) => (
                     <TableRow>
                        <TableCell>
                          <Text>{location.full_address}</Text>
                        </TableCell>
                        <TableCell>
                          <Text>{location.distance} miles</Text>
                        </TableCell>
                        <TableCell>
                          <Link onClick={()=>{goToVehiclePage(location.associations.p_vehicles_collection__vehicles_to_locations.items.map(x => x.hs_object_id)); setSelectedLocation(location)}}>{location.number_of_available_vehicles} Vehicles Available</Link>
                        </TableCell>
                        <TableCell>
                          <Link onClick={()=>{goToVehiclePage(location.associations.p_vehicles_collection__vehicles_to_locations.items.map(x => x.hs_object_id)); setSelectedLocation(location)}}>{location.associations.p_vehicles_collection__vehicles_to_locations.total} Vehicles</Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
          </>
          )}
          {currentStep === 1 && (
            <>
              <Table
                width={'max'}
                paginated={false}
              >
                <TableHead>
                <TableRow>
                  <TableHeader width={'min'}>Make</TableHeader>
                  <TableHeader width={'min'}>
                      Model
                  </TableHeader>
                  <TableHeader width={'min'}>
                    <Link variant="dark"
                      onClick={() => {setVehicleYearSort(vehicleYearSort === 'asc' ? 'desc' : 'asc')}}
                    >
                      Year
                    </Link>
                     {vehicleYearSort === '' ? ' ' : vehicleYearSort === 'asc' ? ' ↓' : ' ↑'}
                  </TableHeader>
                  <TableHeader width={'min'} >
                    Book
                  </TableHeader>
                </TableRow>
                </TableHead>
                <TableBody>

                {vehiclesOnPage.map((vehicle) => (
                 <TableRow>
                    <TableCell>
                      <Text>{vehicle.properties.make}</Text>
                    </TableCell>
                    <TableCell>
                      <Text>{vehicle.properties.model}</Text>
                    </TableCell>
                    <TableCell>
                      <Text>{vehicle.properties.year}</Text>
                    </TableCell>
                    <TableCell>
                      <Link onClick={()=>{goToBookingPage(vehicle)}}>Book now</Link>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </>
          )}
          {currentStep === 2 && (
            <>
            <DescriptionList direction="row">
              <DescriptionListItem label="Pickup Location">
                <Text>{selectedLocation.full_address}</Text>
              </DescriptionListItem>
              <DescriptionListItem>
              <Flex
                width={'auto'}
              >
               <DateInput
                 label="Pickup Date"
                 name="pickupDate"
                 value={pickupDate}
                 max={returnDate}
                 onChange={(value) => {
                   setPickupDate(value);
                 }}
                 format="ll"
                />
               </Flex>
              </DescriptionListItem>
              <DescriptionListItem>
              <Flex
                width={'auto'}
              >
               <DateInput
                 label="Return Date"
                 name="returnDate"
                 value={returnDate}
                 min={pickupDate}
                 onChange={(value) => {
                   setReturnDate(value);
                 }}
                 format="ll"
                 />
               </Flex>
              </DescriptionListItem>
              <DescriptionListItem label="Vehicle">
                <Text>{selectedVehicle.properties.year} {selectedVehicle.properties.make} {selectedVehicle.properties.model}</Text>
              </DescriptionListItem>
              <DescriptionListItem label="Insurance">
              <Select
                    name="insurance"
                    label=""
                    options={[
                      { label: "Yes", value: true },
                      { label: "No", value: false },
                    ]}
                    onChange={(value) => {
                      setInsurance(value);
                    }}
              />
              </DescriptionListItem>
              <DescriptionListItem label="Daily Rate">
                <Text>$ {selectedVehicle.properties.daily_price}</Text>
              </DescriptionListItem>
              <DescriptionListItem label="Days">
                <Text>{days}</Text>
              </DescriptionListItem>
              <DescriptionListItem label="Total">
                <Text>{(selectedVehicle.properties.daily_price * days) + insuranceCost}</Text>
              </DescriptionListItem>
            </DescriptionList>
            </>
          )}
          <Divider />
        </>
    );
};